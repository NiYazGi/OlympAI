import 'server-only'

import { cache } from 'react'
import type { PreparationMock } from '@/lib/preparation'
import type { DailyTopic } from '@/lib/daily-preparation'
import { getDailyPreparation } from '@/lib/supabase/daily-preparation'
import { analyseCompetition } from '@/lib/competition-analysis'
import { getAnalysedTaskCatalogue } from '@/lib/supabase/curriculum-analysis'
import { EMPTY_DAY, type DayInputs } from '@/lib/day-state'
import { trainingToday } from '@/lib/training-time'
import { getDiagnosticProfile } from '@/lib/supabase/diagnostic'
import { taskSkills } from '@/lib/skill-catalogue'
import { getPreparationPersonalGoal } from '@/lib/supabase/preparation-settings'
import { getReference, getStudyReference } from '@/lib/supabase/reference'
import { getAttempts, getCurrentProfile, getGoal, getPreparationSettings } from '@/lib/supabase/queries'
import { createClient } from '@/lib/supabase/server'
import { getStudyProgress } from '@/lib/supabase/study'

export const getPreparation = cache(async () => {
  const [profile, goal] = await Promise.all([getCurrentProfile(), getGoal()])
  if (!profile || profile.role === 'teacher' || !goal.subjectName || !goal.subjectId || !goal.targetDate) return null

  const supabase = await createClient()
  const [reference, study, progress, attempts, tasks, settings, diagnostic, personalGoal, { data: rawDay }, { data: papers }, { data: competition }] =
    await Promise.all([
      getReference(), getStudyReference(), getStudyProgress(), getAttempts(), getAnalysedTaskCatalogue(),
      getPreparationSettings(), getDiagnosticProfile(goal.subjectName), getPreparationPersonalGoal(),
      supabase.from('day_states').select('theory_minutes,solving_minutes,mental,sleep_hours,lights_out,load_minutes').eq('user_id',profile.id).eq('on_date',trainingToday()).maybeSingle(),
      supabase.from('mock_tests').select('id, preparation_key, task_ids, duration_minutes, started_at, submitted_at, preparation_reviewed_at')
        .eq('user_id', profile.id).eq('subject_id', goal.subjectId).order('started_at'),
      goal.competition
        ? supabase.from('competitions').select('slug').eq('id', goal.competition.id).maybeSingle()
        : { data: null },
    ])

  const { preferences } = settings
  const today = trainingToday()
  const day: DayInputs = rawDay && settings.preferences.telegramReflectionEnabled ? { theoryMinutes:rawDay.theory_minutes,solvingMinutes:rawDay.solving_minutes,mental:rawDay.mental,sleepHours:Number(rawDay.sleep_hours),lightsOut:rawDay.lights_out,loadMinutes:rawDay.load_minutes,reported:true } : EMPTY_DAY
  const goalStart = goal.goalSetAt ?? `${today}T00:00:00Z`
  const mockPrefix = `${goal.competition?.id ?? 'subject'}:${goal.subjectId}:${goalStart}:`
  const correctByMock = new Map<string, Set<string>>()
  for (const attempt of attempts) {
    if (!attempt.mock_test_id || !attempt.is_correct) continue
    const correct = correctByMock.get(attempt.mock_test_id) ?? new Set<string>()
    correct.add(attempt.task_id)
    correctByMock.set(attempt.mock_test_id, correct)
  }
  const mocks: PreparationMock[] = (papers ?? []).flatMap((paper) => paper.preparation_key?.startsWith(mockPrefix)
    ? [{
        id: paper.id, key: paper.preparation_key.slice(mockPrefix.length), taskIds: paper.task_ids,
        minutes: paper.duration_minutes, startedAt: paper.started_at, completedAt: paper.submitted_at,
        reviewedAt: paper.preparation_reviewed_at,
        missedTaskIds: paper.task_ids.filter((id) => !correctByMock.get(paper.id)?.has(id)),
      }]
    : [])

  const taskTopic = new Map(tasks.map((task) => [task.id, reference.topics.find((topic) => topic.name === task.topic && reference.subjectById[topic.subject_id] === task.subject)?.id]))
  const currentGrade = preferences.schoolGrade ?? profile.grade
  const results = new Map<string, { correct: number; total: number }>()
  const record = (topic: string, correct: boolean) => {
    const entry = results.get(topic) ?? { correct: 0, total: 0 }
    entry.total++
    if (correct) entry.correct++
    results.set(topic, entry)
  }
  const completedTasks = new Map<string, string>()
  const seenTask = new Set<string>()
  for (const attempt of attempts) {
    const topic = taskTopic.get(attempt.task_id)
    if (!topic) continue
    if (!seenTask.has(attempt.task_id)) {
      record(topic, attempt.is_correct)
      seenTask.add(attempt.task_id)
    }
    if (attempt.is_correct && !attempt.mock_test_id && attempt.created_at >= goalStart) {
      // Attempts are newest first. Keep the first completion of this step.
      completedTasks.set(attempt.task_id, attempt.created_at)
    }
  }

  const latestAnswer = new Map<string, (typeof progress.quiz)[number]>()
  const firstAnswer = new Map<string, string>()
  for (const answer of progress.quiz) {
    const latest = latestAnswer.get(answer.question_id)
    if (!latest || latest.created_at < answer.created_at) latestAnswer.set(answer.question_id, answer)
    const first = firstAnswer.get(answer.question_id)
    if (!first || first > answer.created_at) firstAnswer.set(answer.question_id, answer.created_at)
  }
  const lessonViews = new Map(progress.views.map((row) => [row.lesson_id, row.completed_at]))
  const topics: DailyTopic[] = reference.topics.filter((topic) => topic.subject_id === goal.subjectId).map((topic) => {
    const lesson = study.lessons.find((item) => item.topic_id === topic.id)
    const questions = study.questions.filter((item) => item.topic_id === topic.id && item.id.startsWith('daily-'))
    const answered = questions.flatMap((question) => firstAnswer.get(question.id) ?? [])
    for (const question of questions) {
      const result = latestAnswer.get(question.id)
      if (result) record(topic.id, result.is_correct)
    }
    const result = results.get(topic.id)
    return {
      id: topic.id, questionIds: questions.map((question) => question.id),
      name: topic.name, slug: topic.slug, position: topic.position,
      mastery: result ? Math.round(100 * result.correct / result.total) : null,
      lesson: lesson ? {
        id: lesson.id, title: lesson.title, minutes: Math.max(1, lesson.estimated_minutes ?? 15),
        completedAt: lessonViews.get(lesson.id) ?? null,
      } : null,
      quiz: questions.length > 0 ? {
        minutes: Math.max(5, questions.length * 2),
        completedAt: answered.length === questions.length ? answered.sort().at(-1)! : null,
      } : null,
    }
  })

  const taskLinks=reference.tasks.filter((task)=>task.subject_id===goal.subjectId).map((task)=>({id:task.id,skills:taskSkills({id:task.id,subject:reference.subjectById[task.subject_id] ?? '',topic:reference.topicById[task.topic_id],problem:task.problem})}))
  return {
    name: goal.competition?.name ?? goal.subjectName,
    subject: goal.subjectName,
    subjectId: goal.subjectId,
    targetDate: goal.targetDate,
    competitionSlug: competition?.slug ?? null,
    mockPrefix,
    preferences,
    customSchedule: settings.custom,
    currentGrade,
    intensity: profile.training_intensity,
    analysis: analyseCompetition(tasks, goal.subjectName, competition?.slug ?? null),
    personalGoal, diagnostic,
    plan: await getDailyPreparation({
      today, targetDate: goal.targetDate, goalStart, competitionSlug: competition?.slug ?? null,
      competitionLevel: goal.competition?.level ?? null, subject: goal.subjectName, grade: profile.grade, level: profile.level,
      preferences, day, topics, tasks, completedTasks, mocks,
      taskSkillIds: Object.fromEntries(taskLinks.map((task)=>[task.id,task.skills.map((skill)=>skill.id)])),
      taskSkillWeights: Object.fromEntries(taskLinks.map((task)=>[task.id,Object.fromEntries(task.skills.map((skill)=>[skill.id,skill.provenance==='editorial'?1:0.25]))])),
      skillPriorities: Object.fromEntries(Object.entries(diagnostic.skillScores).map(([id,score])=>[id,diagnostic.strongSkillIds.includes(id)?100-score:Math.max(25,100-score)+(diagnostic.skillChecks[id]?.hinted?20:0)])),
      reservedMinutesByDate: !diagnostic.completedAt || diagnostic.studyDate===today ? { [today]: Math.min(preferences.sessionMinutes,diagnostic.studyMinutes || diagnostic.estimatedMinutes) } : {},
    }, topics, mockPrefix),
  }
})
