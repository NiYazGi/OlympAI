import { CRUNCH_DAYS, TAPER_DAYS } from '@/lib/day-state'
import { isCompetitionTask, analyseCompetition } from '@/lib/competition-analysis'
import { fitsGrade, gradeRange } from '@/lib/profile-options'
import { realPapers } from '@/lib/mock'
import { makeMock, type PreparationInput, type PreparationTopic } from '@/lib/preparation'

export type DailyTopic = PreparationTopic & { id: string; questionIds: string[] }
export type DailyDraft = {
  on_date: string
  topic_id: string | null
  lesson_id: string | null
  task_ids: string[]
  question_ids: string[]
  minutes: number
  mock_key: string | null
  full_paper: boolean
}

export function planDailySessions(input: PreparationInput, topics: DailyTopic[]): DailyDraft[] {
  const required = input.preferences.dailyTasks ?? 5
  const grade = input.preferences.schoolGrade
  const range: [number, number] | null = grade ? [grade, grade] : gradeRange(input.grade)
  const exact = (task: { id: string }) => isCompetitionTask(task, input.competitionSlug)
  const level = input.competitionLevel === 'International' ? 5 : input.competitionLevel === 'National' ? 4 : 3
  const pool = input.tasks.filter((task) => task.subject === input.subject && fitsGrade(task, range) && !task.solved)
    .sort((a, b) => Number(exact(b)) - Number(exact(a)) || Math.abs(a.difficulty - level) - Math.abs(b.difficulty - level) || a.id.localeCompare(b.id))
  const analysis = analyseCompetition(pool, input.subject, input.competitionSlug)
  const priority = new Map(analysis.topics.map((topic, index) => [topic.topic, index]))
  const ordered = topics.filter((topic) => topic.lesson && topic.questionIds.length > 0)
    .sort((a, b) => (priority.get(a.name) ?? 100) - (priority.get(b.name) ?? 100) ||
      (a.mastery ?? 50) - (b.mastery ?? 50) || a.position - b.position)
  const dates: { date: string; daysLeft: number }[] = []
  const start = Date.parse(input.today + 'T00:00:00Z')
  const end = Date.parse(input.targetDate + 'T00:00:00Z')
  for (let offset = 0; offset < 730; offset++) {
    const date = new Date(start + offset * 86_400_000)
    const daysLeft = Math.round((end - date.getTime()) / 86_400_000)
    if (daysLeft <= TAPER_DAYS) break
    if (input.preferences.weekdays.includes(date.getUTCDay())) dates.push({ date: date.toISOString().slice(0, 10), daysLeft })
  }

  const rehearsals = dates.filter((day) => day.daysLeft <= CRUNCH_DAYS)
  const mockDates = new Set(rehearsals.length >= 6
    ? [rehearsals[Math.floor(rehearsals.length / 3)].date, rehearsals[rehearsals.length - 2].date]
    : rehearsals.length ? [rehearsals[Math.max(0, rehearsals.length - 2)].date] : [])
  const reserved = new Set(input.mocks.flatMap((mock) => mock.taskIds))
  const mockKeys = ['mock-1', 'mock-2'].filter((key) => !input.mocks.some((mock) => mock.key === key))
  const mocks = new Map<string, DailyDraft>()
  const papers = realPapers(pool)
  for (const date of mockDates) {
    if (!mockKeys.length || input.mocks.some((mock) => !mock.completedAt)) break
    const mock = makeMock(pool.filter((task) => !reserved.has(task.id)), papers, exact, input.preferences.sessionMinutes)
    if (!mock) continue
    mock.mock.taskIds.forEach((id) => reserved.add(id))
    mocks.set(date, { on_date: date, topic_id: null, lesson_id: null, task_ids: mock.mock.taskIds,
      question_ids: [], minutes: mock.minutes, mock_key: mockKeys.shift()!, full_paper: mock.mock.fullPaper })
  }

  const sessions: DailyDraft[] = []
  let nextTopic = 0
  for (const { date } of dates) {
    const mock = mocks.get(date)
    if (mock) {
      sessions.push(mock)
      continue
    }
    const options = [...ordered.slice(nextTopic), ...ordered.slice(0, nextTopic)]
    const topic = options.find((item) => pool.filter((task) => task.topic === item.name && !reserved.has(task.id)).length >= required)
    if (!topic?.lesson) continue
    const tasks = pool.filter((task) => task.topic === topic.name && !reserved.has(task.id)).slice(0, required)
    tasks.forEach((task) => reserved.add(task.id))
    const reading = topic.lesson.completedAt ? 5 : topic.lesson.minutes
    sessions.push({
      on_date: date, topic_id: topic.id, lesson_id: topic.lesson.id, task_ids: tasks.map((task) => task.id),
      question_ids: topic.questionIds, minutes: reading + tasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? 25), 0) + (topic.quiz?.minutes ?? 6),
      mock_key: null, full_paper: false,
    })
    nextTopic = (ordered.indexOf(topic) + 1) % ordered.length
  }
  return sessions
}
