import 'server-only'

import { cache } from 'react'
import { getSessionUserId } from '@/lib/supabase/auth'
import { getReference } from '@/lib/supabase/reference'
import { getFlame } from '@/lib/supabase/visits'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { pointsFromScore, protocolFromRow, verdictOf, type Protocol } from '@/lib/protocol'
import type { Verdict } from '@/lib/sulu/types'
import {
  levelFromXp,
  quizXp,
  quizXpOnDay,
  totalXp,
  xpOnDay,
  type XpAttempt,
  type XpQuizAnswer,
} from '@/lib/xp'
import type {
  CatalogueTask,
  CompetitionOption,
  Goal,
  Profile,
  ProgressAnalytics,
  TaskDetail,
} from '@/lib/types'

export type {
  Profile,
  ProgressAnalytics,
  CatalogueTask,
  TaskDetail,
} from '@/lib/types'

const emptyAnalytics: ProgressAnalytics = {
  hasData: false,
  totalAttempts: 0,
  correctAnswers: 0,
  accuracy: 0,
  activeStreak: 0,
  longestCorrectRun: 0,
  currentLevel: null,
  recentActivity: [],
  accuracyTrend: [],
  topics: [],
  weakTopics: [],
  strongTopics: [],
  recentMistakes: [],
  xp: {
    total: 0,
    today: 0,
    goal: 50,
    level: 1,
    intoLevel: 0,
    levelSpan: 100,
    levelPercent: 0,
    toNextLevel: 100,
  },
}

const utcDay = (value: string | Date) =>
  (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10)

function dayOffset(offset: number) {
  const day = new Date()
  day.setUTCDate(day.getUTCDate() - offset)
  return day
}

/** Monday of the UTC week containing `value`. */
function startOfUtcWeek(value: Date) {
  const start = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  )
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7))
  return start
}

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getSessionUserId()
  if (!userId) return null

  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  return data
})

/** Every attempt this user has made. One query, shared by the whole render. */
const getAttempts = cache(async () => {
  const userId = await getSessionUserId()
  if (!userId) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('task_attempts')
    .select('task_id, is_correct, score, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
})

/** Quiz answers, for the XP and streak the check step now contributes to. */
const getQuizAnswers = cache(async (): Promise<XpQuizAnswer[]> => {
  const userId = await getSessionUserId()
  if (!userId) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('quiz_attempts')
    .select('question_id, is_correct, created_at')
    .eq('user_id', userId)
  return (data ?? []).map((row) => ({
    questionId: row.question_id,
    isCorrect: row.is_correct,
    createdAt: row.created_at,
  }))
})

/**
 * The task catalogue.
 *
 * Reference content comes from the shared cache and the attempts from the one
 * per-request query, so this costs nothing beyond what the page already paid.
 */
export const getTaskCatalogue = cache(async (): Promise<CatalogueTask[]> => {
  if (!hasSupabaseEnv()) return []
  const [reference, attempts] = await Promise.all([getReference(), getAttempts()])

  const byTask = new Map<string, { total: number; solved: boolean }>()
  for (const attempt of attempts) {
    const current = byTask.get(attempt.task_id) ?? { total: 0, solved: false }
    current.total += 1
    current.solved = current.solved || attempt.is_correct
    byTask.set(attempt.task_id, current)
  }

  return reference.tasks.map((task) => {
    const record = byTask.get(task.id)
    return {
      id: task.id,
      title: task.title,
      subject: reference.subjectById[task.subject_id] ?? 'General',
      topic: reference.topicById[task.topic_id] ?? 'General practice',
      topicPosition: reference.topicPositionById[task.topic_id] ?? 99,
      level: task.level,
      paper: task.paper,
      difficulty: task.difficulty,
      estimatedMinutes: task.estimated_minutes,
      source: task.source,
      solved: record?.solved ?? false,
      attempts: record?.total ?? 0,
    }
  })
})

/**
 * One task, with the full statement.
 *
 * `official_solution` never appears here: it is read only inside the grader, on
 * the server. Selecting it would ship the answer in the page payload.
 */
export const getTaskDetail = cache(async (slug: string): Promise<TaskDetail | null> => {
  if (!hasSupabaseEnv()) return null
  const [reference, attempts] = await Promise.all([getReference(), getAttempts()])

  // A class's own problem is not in the shared catalogue; it is read as this
  // user, so the row policy decides whether they are in the class.
  const task =
    reference.tasks.find((entry) => entry.id === slug) ?? (await getClassTask(slug))
  if (!task) return null

  const history = attempts.filter((attempt) => attempt.task_id === slug)
  return {
    id: task.id,
    title: task.title,
    subject: reference.subjectById[task.subject_id] ?? 'General',
    topic: reference.topicById[task.topic_id] ?? 'General practice',
    topicPosition: reference.topicPositionById[task.topic_id] ?? 99,
    level: task.level,
    paper: task.paper,
    difficulty: task.difficulty,
    estimatedMinutes: task.estimated_minutes,
    source: task.source,
    solved: history.some((attempt) => attempt.is_correct),
    attempts: history.length,
    problem: task.problem,
    given: task.given ?? [],
    findPrompt: task.find_prompt,
    diagramUrl: task.diagram_url,
    hints: task.hints ?? [],
    bestScore: history.length ? Math.max(...history.map((attempt) => attempt.score)) : null,
    sourceUrl: task.source_url,
    licence: task.licence,
    attribution: task.attribution,
  }
})

async function getClassTask(id: string) {
  if (!id.startsWith('class-')) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('tasks')
    .select(
      'id, subject_id, topic_id, title, problem, difficulty, hints, source, estimated_minutes, given, find_prompt, diagram_url, source_url, licence, attribution',
    )
    .eq('id', id)
    .not('class_id', 'is', null)
    .maybeSingle()
  return data ? { ...data, level: null, paper: null } : null
}

export type AttemptSummary = {
  id: string
  createdAt: string
  verdict: Verdict
  points: number
  pointsDerived: boolean
}

/** This user's attempts at one task, newest first: the list beside the editor. */
export const getTaskAttemptHistory = cache(async (taskId: string): Promise<AttemptSummary[]> => {
  if (!hasSupabaseEnv()) return []
  const userId = await getSessionUserId()
  if (!userId) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('task_attempts')
    .select('id, created_at, is_correct, score, points')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(10)
  return (data ?? []).map((row) => {
    const verdict = verdictOf(row)
    return {
      id: row.id,
      createdAt: row.created_at,
      verdict,
      points: row.points ?? pointsFromScore(verdict, row.score),
      pointsDerived: row.points === null,
    }
  })
})

export type AttemptDetail = {
  id: string
  taskId: string
  userId: string
  createdAt: string
  protocol: Protocol
}

/**
 * One attempt with its protocol.
 *
 * Read with the caller's own client, so RLS decides who may see it: the
 * student who wrote it, or a teacher of theirs. Nothing here checks either,
 * because the policy already does and a second check could only disagree.
 */
export const getAttemptDetail = cache(async (attemptId: string): Promise<AttemptDetail | null> => {
  if (!hasSupabaseEnv()) return null
  // A malformed id is a missing attempt, not a database error.
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) return null

  const supabase = await createClient()
  const { data: row } = await supabase
    .from('task_attempts')
    .select(
      'id, task_id, user_id, created_at, answer, is_correct, score, feedback, points, summary, marks, criteria, break_point',
    )
    .eq('id', attemptId)
    .maybeSingle()
  if (!row) return null

  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    createdAt: row.created_at,
    protocol: protocolFromRow(row),
  }
})

/** Lectures and readings attached to a task, or to the topic it belongs to. */
export const getTaskResources = cache(async (taskId: string) => {
  if (!hasSupabaseEnv()) return []
  const reference = await getReference()
  const task = reference.tasks.find((entry) => entry.id === taskId)
  if (!task) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('resources')
    .select('id, kind, title, url, description, licence, attribution, task_id, position')
    .or(`task_id.eq.${taskId},topic_id.eq.${task.topic_id}`)
    .order('position', { ascending: true })

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as 'video' | 'reading' | 'reference',
    title: row.title,
    url: row.url,
    description: row.description,
    licence: row.licence as import('@/lib/licence').Licence,
    attribution: row.attribution,
  }))
})

/**
 * Readings attached to a topic.
 *
 * The ladder is four rungs of this project's own material; this is where the
 * rest of the subject lives — the open textbooks and references someone can
 * actually go and read. Only sources whose own licence allows it are listed,
 * which is why some subjects have none.
 */
export const getTopicReading = cache(async (topicId: string) => {
  if (!hasSupabaseEnv()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('resources')
    .select('id, kind, title, url, description, licence, attribution, position')
    .eq('topic_id', topicId)
    .order('position', { ascending: true })

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as 'video' | 'reading' | 'reference',
    title: row.title,
    url: row.url,
    description: row.description,
    licence: row.licence as import('@/lib/licence').Licence,
    attribution: row.attribution,
  }))
})

/** Subjects with how much content each actually has, for the target picker. */
export const getSubjectSummary = cache(
  async (): Promise<{ id: string; name: string; taskCount: number }[]> => {
    if (!hasSupabaseEnv()) return []
    const reference = await getReference()
    const counts = new Map<string, number>()
    for (const task of reference.tasks) {
      counts.set(task.subject_id, (counts.get(task.subject_id) ?? 0) + 1)
    }
    return Object.entries(reference.subjectById)
      .map(([id, name]) => ({ id, name, taskCount: counts.get(id) ?? 0 }))
      .sort((a, b) => b.taskCount - a.taskCount || a.name.localeCompare(b.name))
  },
)

/** Everything a student can aim at, with how much content backs each one. */
export const getCompetitionOptions = cache(async (): Promise<CompetitionOption[]> => {
  if (!hasSupabaseEnv()) return []
  const supabase = await createClient()
  const [{ data: rows }, reference] = await Promise.all([
    supabase
      .from('competitions')
      .select('id, name, level, subject_id, registration_url')
      .eq('active', true)
      .order('name', { ascending: true }),
    getReference(),
  ])

  const counts = new Map<string, number>()
  for (const task of reference.tasks) {
    counts.set(task.subject_id, (counts.get(task.subject_id) ?? 0) + 1)
  }

  return (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    level: row.level,
    subjectId: row.subject_id,
    subjectName: row.subject_id ? (reference.subjectById[row.subject_id] ?? null) : null,
    registrationUrl: row.registration_url,
    taskCount: row.subject_id ? (counts.get(row.subject_id) ?? 0) : 0,
  }))
})

/**
 * The student's target.
 *
 * A competition supplies the subject when it has one; a generic target (a
 * national round, say) does not, so the explicitly chosen subject still
 * applies. Either way the date is the student's own.
 */
export const getGoal = cache(async (): Promise<Goal> => {
  const [profile, reference, competitions] = await Promise.all([
    getCurrentProfile(),
    getReference(),
    getCompetitionOptions(),
  ])
  const competition =
    competitions.find((entry) => entry.id === profile?.target_competition_id) ?? null

  /*
   * Order matters. A competition that names a subject settles it. Otherwise the
   * explicit choice on this page wins. Failing both, fall back to the subject
   * the student already gave during onboarding — that answer was being ignored,
   * so someone who said "Economics" at setup and then picked a generic target
   * could end up on a path through whichever subject they happened to tap next.
   */
  const byName = Object.entries(reference.subjectById).find(
    ([, name]) => name === profile?.primary_subject,
  )?.[0]
  const subjectId = competition?.subjectId ?? profile?.target_subject_id ?? byName ?? null

  return {
    competition,
    subjectId,
    subjectName: subjectId ? (reference.subjectById[subjectId] ?? null) : null,
    targetDate: profile?.target_date ?? null,
    subjectLocked: Boolean(competition?.subjectId),
  }
})

export const getProgressAnalytics = cache(async (): Promise<ProgressAnalytics> => {
  if (!hasSupabaseEnv()) return emptyAnalytics

  const [attemptsList, reference, profile, quizAnswers, flame] = await Promise.all([
    getAttempts(),
    getReference(),
    getCurrentProfile(),
    getQuizAnswers(),
    getFlame(),
  ])
  const goal = profile?.daily_xp_goal ?? 50

  // A student who has read lessons and answered questions but not yet submitted
  // a derivation used to fall through here with a blank profile: zero XP, zero
  // streak, and a dashboard that had just told them to do exactly that.
  if (attemptsList.length === 0 && quizAnswers.length === 0) {
    return {
      ...emptyAnalytics,
      activeStreak: flame.current,
      currentLevel: profile?.level ?? null,
      xp: { ...emptyAnalytics.xp, goal },
    }
  }

  const taskById = new Map(reference.tasks.map((task) => [task.id, task]))
  const topicOf = (taskId: string) => {
    const task = taskById.get(taskId)
    return task ? reference.topicById[task.topic_id] ?? 'General practice' : 'General practice'
  }

  const byTopic = new Map<string, { attempts: number; correct: number }>()
  const dayCounts = new Map<string, number>()
  const byWeek = new Map<string, { attempts: number; correct: number }>()
  for (const attempt of attemptsList) {
    const topic = topicOf(attempt.task_id)
    const current = byTopic.get(topic) ?? { attempts: 0, correct: 0 }
    current.attempts += 1
    current.correct += attempt.is_correct ? 1 : 0
    byTopic.set(topic, current)

    const day = utcDay(attempt.created_at)
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)

    const week = utcDay(startOfUtcWeek(new Date(attempt.created_at)))
    const weekly = byWeek.get(week) ?? { attempts: 0, correct: 0 }
    weekly.attempts += 1
    weekly.correct += attempt.is_correct ? 1 : 0
    byWeek.set(week, weekly)
  }

  const accuracyTrend = [...byWeek]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, value]) => ({
      label: new Date(`${week}T00:00:00Z`).toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
      accuracy: Math.round((value.correct / value.attempts) * 100),
    }))

  const topicStats = [...byTopic]
    .map(([topic, value]) => ({
      topic,
      attempts: value.attempts,
      correct: value.correct,
      mastery: Math.round((value.correct / value.attempts) * 100),
    }))
    .sort((a, b) => a.mastery - b.mastery)

  // Answering questions is activity. Counting only submitted derivations meant
  // a week of lessons and quizzes showed a streak of zero.
  for (const answer of quizAnswers) {
    const day = utcDay(answer.createdAt)
    if (!dayCounts.has(day)) dayCounts.set(day, 0)
  }


  const recentActivity = Array.from({ length: 7 }, (_, index) => {
    const day = dayOffset(6 - index)
    return {
      day: day.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' }),
      problems: dayCounts.get(utcDay(day)) ?? 0,
    }
  })

  // attemptsList is newest-first; walk it in submission order.
  let longestCorrectRun = 0
  let run = 0
  for (let index = attemptsList.length - 1; index >= 0; index -= 1) {
    run = attemptsList[index]!.is_correct ? run + 1 : 0
    if (run > longestCorrectRun) longestCorrectRun = run
  }

  const xpAttempts: XpAttempt[] = attemptsList.map((attempt) => ({
    taskId: attempt.task_id,
    difficulty: taskById.get(attempt.task_id)?.difficulty ?? 1,
    isCorrect: attempt.is_correct,
    score: attempt.score,
    createdAt: attempt.created_at,
  }))
  // Both halves of the ladder that produce evidence: solved problems and
  // answered questions. Card reviews and "mark as read" are the student's own
  // claim about their own work and are written by the client, so they move the
  // topic's progress and not the level.
  const xpTotal = totalXp(xpAttempts) + quizXp(quizAnswers)
  const progress = levelFromXp(xpTotal)

  const correctAnswers = attemptsList.filter((attempt) => attempt.is_correct).length
  return {
    hasData: true,
    totalAttempts: attemptsList.length,
    correctAnswers,
    // Zero attempts reaches here whenever a student has answered quiz
    // questions and not yet submitted a derivation — a whole first week, for
    // most people. Dividing by it produced NaN, and NaN travels: it reached
    // the readiness ring as "NaN%" and /me as "NaN% accuracy". Callers that
    // mean "we do not know yet" test totalAttempts rather than hasData, which
    // is true as soon as there is activity of any kind.
    accuracy: attemptsList.length > 0 ? Math.round((correctAnswers / attemptsList.length) * 100) : 0,
    // The flame: days in a row the app was opened (lib/supabase/visits.ts).
    // It used to be days with an attempt, which a beginner reading their
    // first lessons could not keep alive; one streak, counted one way.
    activeStreak: flame.current,
    longestCorrectRun,
    currentLevel: profile?.level ?? null,
    recentActivity,
    accuracyTrend,
    topics: topicStats,
    weakTopics: topicStats
      .filter((item) => item.mastery < 70)
      .slice(0, 3)
      .map((item) => item.topic),
    strongTopics: topicStats
      .filter((item) => item.mastery >= 85)
      .slice(-3)
      .map((item) => item.topic),
    recentMistakes: [
      ...new Set(
        attemptsList
          .filter((attempt) => !attempt.is_correct)
          .map((attempt) => taskById.get(attempt.task_id)?.title ?? 'Practice task'),
      ),
    ].slice(0, 3),
    xp: {
      total: xpTotal,
      today:
        xpOnDay(xpAttempts, utcDay(new Date())) +
        quizXpOnDay(quizAnswers, utcDay(new Date())),
      goal,
      level: progress.level,
      intoLevel: progress.into,
      levelSpan: progress.span,
      levelPercent: progress.percent,
      toNextLevel: progress.toNext,
    },
  }
})

export type MockSummary = {
  id: string
  subject: string
  taskCount: number
  durationMinutes: number
  startedAt: string
  submittedAt: string | null
  scorePercent: number | null
  level: string | null
}

export type MockPaper = {
  id: string
  subject: string
  durationMinutes: number
  startedAt: string
  submittedAt: string | null
  scorePercent: number | null
  level: string | null
  questions: {
    id: string
    title: string
    problem: string
    given: string[]
    findPrompt: string | null
    diagramUrl: string | null
    difficulty: number
    /** Present only after submission. */
    answer: string | null
    score: number | null
    isCorrect: boolean | null
    feedback: string | null
  }[]
}

export const getMockHistory = cache(async (): Promise<MockSummary[]> => {
  if (!hasSupabaseEnv()) return []
  const userId = await getSessionUserId()
  if (!userId) return []

  const supabase = await createClient()
  const [{ data: rows }, reference] = await Promise.all([
    supabase
      .from('mock_tests')
      .select('id, subject_id, task_ids, duration_minutes, started_at, submitted_at, score_percent, level')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(20),
    getReference(),
  ])

  return (rows ?? []).map((row) => ({
    id: row.id,
    subject: reference.subjectById[row.subject_id] ?? 'Practice',
    taskCount: row.task_ids.length,
    durationMinutes: row.duration_minutes,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    scorePercent: row.score_percent,
    level: row.level,
  }))
})

/**
 * One paper, with the questions in order.
 *
 * The reference solution is never selected: during the test it would be the
 * answer key, and afterwards the grader's feedback is the useful part.
 */
export const getMockPaper = cache(async (id: string): Promise<MockPaper | null> => {
  if (!hasSupabaseEnv()) return null
  const userId = await getSessionUserId()
  if (!userId) return null

  const supabase = await createClient()
  const { data: test } = await supabase
    .from('mock_tests')
    .select('id, subject_id, task_ids, duration_minutes, started_at, submitted_at, score_percent, level')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (!test) return null

  const [reference, { data: attempts }] = await Promise.all([
    getReference(),
    supabase
      .from('task_attempts')
      .select('task_id, answer, score, is_correct, feedback')
      .eq('mock_test_id', test.id)
      .eq('user_id', userId),
  ])

  const byTask = new Map((attempts ?? []).map((row) => [row.task_id, row]))
  const taskById = new Map(reference.tasks.map((task) => [task.id, task]))

  return {
    id: test.id,
    subject: reference.subjectById[test.subject_id] ?? 'Practice',
    durationMinutes: test.duration_minutes,
    startedAt: test.started_at,
    submittedAt: test.submitted_at,
    scorePercent: test.score_percent,
    level: test.level,
    questions: test.task_ids.flatMap((taskId) => {
      const task = taskById.get(taskId)
      if (!task) return []
      const attempt = byTask.get(taskId)
      return [
        {
          id: task.id,
          title: task.title,
          problem: task.problem,
          given: task.given ?? [],
          findPrompt: task.find_prompt,
          diagramUrl: task.diagram_url,
          difficulty: task.difficulty,
          answer: attempt?.answer ?? null,
          score: attempt?.score ?? null,
          isCorrect: attempt?.is_correct ?? null,
          feedback: attempt?.feedback ?? null,
        },
      ]
    }),
  }
})
