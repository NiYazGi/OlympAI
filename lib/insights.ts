import 'server-only'

import { getAttempts, getGoal, getTaskCatalogue } from '@/lib/supabase/queries'

/**
 * The two Pro read-outs: a map of skills and gaps per topic, and a weekly
 * readiness report. Both are computed from the student's own attempts and
 * the catalogue on every read — nothing new is stored.
 */

export type SkillState = 'strong' | 'developing' | 'gap' | 'untouched'

export type SkillRow = {
  topic: string
  subject: string
  position: number
  tasks: number
  tried: number
  solved: number
  attempts: number
  accuracy: number | null
  averageScore: number | null
  state: SkillState
}

function stateFor(attempts: number, accuracy: number | null): SkillState {
  if (!attempts || accuracy === null) return 'untouched'
  if (attempts >= 3 && accuracy >= 70) return 'strong'
  if (attempts >= 2 && accuracy < 45) return 'gap'
  return 'developing'
}

export async function getSkillMap(): Promise<{ subject: string | null; rows: SkillRow[] }> {
  const [catalogue, attempts, goal] = await Promise.all([getTaskCatalogue(), getAttempts(), getGoal()])
  const byTask = new Map(catalogue.map((task) => [task.id, task]))
  const subjects = new Set<string>()
  if (goal.subjectName) subjects.add(goal.subjectName)
  for (const attempt of attempts) {
    const task = byTask.get(attempt.task_id)
    if (task) subjects.add(task.subject)
  }
  if (!subjects.size) for (const task of catalogue) subjects.add(task.subject)

  const rows = new Map<string, SkillRow & { scoreSum: number; correct: number; triedIds: Set<string>; solvedIds: Set<string> }>()
  for (const task of catalogue) {
    if (!subjects.has(task.subject)) continue
    const key = `${task.subject}::${task.topic}`
    const row = rows.get(key) ?? {
      topic: task.topic, subject: task.subject, position: task.topicPosition, tasks: 0, tried: 0, solved: 0, attempts: 0,
      accuracy: null, averageScore: null, state: 'untouched' as SkillState, scoreSum: 0, correct: 0, triedIds: new Set<string>(), solvedIds: new Set<string>(),
    }
    row.tasks += 1
    rows.set(key, row)
  }
  for (const attempt of attempts) {
    if (attempt.mock_test_id && !attempt.score && !attempt.is_correct) continue
    const task = byTask.get(attempt.task_id)
    if (!task) continue
    const row = rows.get(`${task.subject}::${task.topic}`)
    if (!row) continue
    row.attempts += 1
    row.scoreSum += attempt.score ?? 0
    if (attempt.is_correct) {
      row.correct += 1
      row.solvedIds.add(task.id)
    }
    row.triedIds.add(task.id)
  }
  const result = [...rows.values()].map(({ scoreSum, correct, triedIds, solvedIds, ...row }) => {
    const accuracy = row.attempts ? Math.round((correct / row.attempts) * 100) : null
    return {
      ...row,
      tried: triedIds.size,
      solved: solvedIds.size,
      accuracy,
      averageScore: row.attempts ? Math.round(scoreSum / row.attempts) : null,
      state: stateFor(row.attempts, accuracy),
    }
  })
  result.sort((a, b) => a.subject.localeCompare(b.subject) || a.position - b.position || a.topic.localeCompare(b.topic))
  return { subject: goal.subjectName, rows: result }
}

export type WeeklyReport = {
  from: string
  to: string
  attempts: number
  solved: number
  accuracy: number | null
  previousAccuracy: number | null
  activeDays: number
  newSolved: number
  topics: { topic: string; attempts: number; correct: number }[]
  mistakes: { id: string; title: string }[]
  readiness: number | null
  daysLeft: number | null
  target: string | null
  recommendations: { text: string; vars?: Record<string, string | number>; href?: string }[]
}

const DAY = 24 * 60 * 60 * 1000

export async function getWeeklyReport(): Promise<WeeklyReport> {
  const [catalogue, attempts, goal, skills] = await Promise.all([getTaskCatalogue(), getAttempts(), getGoal(), getSkillMap()])
  const byTask = new Map(catalogue.map((task) => [task.id, task]))
  const now = Date.now()
  const inRange = (at: string, from: number, to: number) => {
    const time = new Date(at).getTime()
    return time >= from && time < to
  }
  const week = attempts.filter((attempt) => inRange(attempt.created_at, now - 7 * DAY, now + 1))
  const before = attempts.filter((attempt) => inRange(attempt.created_at, now - 14 * DAY, now - 7 * DAY))
  const accuracy = (list: typeof attempts) => (list.length ? Math.round((list.filter((a) => a.is_correct).length / list.length) * 100) : null)

  const solvedBefore = new Set(attempts.filter((a) => a.is_correct && new Date(a.created_at).getTime() < now - 7 * DAY).map((a) => a.task_id))
  const solvedThisWeek = new Set(week.filter((a) => a.is_correct).map((a) => a.task_id))
  const topics = new Map<string, { topic: string; attempts: number; correct: number }>()
  for (const attempt of week) {
    const topic = byTask.get(attempt.task_id)?.topic ?? 'General practice'
    const row = topics.get(topic) ?? { topic, attempts: 0, correct: 0 }
    row.attempts += 1
    if (attempt.is_correct) row.correct += 1
    topics.set(topic, row)
  }
  const stillWrong = new Set<string>()
  for (const attempt of week) {
    if (attempt.is_correct) stillWrong.delete(attempt.task_id)
    else if (!solvedThisWeek.has(attempt.task_id) && !solvedBefore.has(attempt.task_id)) stillWrong.add(attempt.task_id)
  }

  // Readiness: share of the target subject's topics in good shape, weighted by accuracy.
  const targetRows = skills.rows.filter((row) => !goal.subjectName || row.subject === goal.subjectName)
  const readiness = targetRows.length
    ? Math.round(
        (targetRows.reduce((sum, row) => sum + (row.state === 'strong' ? 1 : row.state === 'developing' ? 0.5 : 0), 0) / targetRows.length) * 100,
      )
    : null
  const daysLeft = goal.targetDate ? Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - now) / DAY)) : null

  const recommendations: WeeklyReport['recommendations'] = []
  const gaps = targetRows.filter((row) => row.state === 'gap').sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
  const untouched = targetRows.filter((row) => row.state === 'untouched')
  const activeDays = new Set(week.map((attempt) => attempt.created_at.slice(0, 10))).size
  const thisAccuracy = accuracy(week)
  const lastAccuracy = accuracy(before)
  if (!week.length) recommendations.push({ text: 'No problems this week. Start with one short session today: a single problem keeps the habit alive.', href: '/tasks' })
  if (gaps[0]) recommendations.push({ text: 'Close the gap in {topic}: re-read the method and solve two easier problems before returning to the hard ones.', vars: { topic: gaps[0].topic } })
  if (gaps[1]) recommendations.push({ text: 'Next weak spot: {topic}.', vars: { topic: gaps[1].topic } })
  if (untouched[0] && (daysLeft === null || daysLeft > 14)) recommendations.push({ text: 'Not started yet: {topic}. Take its first problem this week.', vars: { topic: untouched[0].topic } })
  if (week.length && activeDays < 3) recommendations.push({ text: 'You practised on {n} {n|day|days}. Three short sessions a week beat one long one.', vars: { n: activeDays } })
  if (thisAccuracy !== null && lastAccuracy !== null && thisAccuracy + 15 < lastAccuracy) recommendations.push({ text: 'Accuracy fell from {before}% to {now}%: step one difficulty level down for a few days.', vars: { before: lastAccuracy, now: thisAccuracy } })
  if (thisAccuracy !== null && thisAccuracy >= 80 && week.length >= 5) recommendations.push({ text: 'Accuracy is high: raise the difficulty or sit a timed paper.', href: '/mock' })
  if (daysLeft !== null && daysLeft <= 14) recommendations.push({ text: '{n} {n|day|days} to the olympiad: switch to full timed papers and reviewing mistakes, no new topics.', vars: { n: daysLeft }, href: '/mock' })
  if (!recommendations.length) recommendations.push({ text: 'Steady week. Keep the rhythm and take one problem a level harder than usual.' })

  return {
    from: new Date(now - 7 * DAY).toISOString(),
    to: new Date(now).toISOString(),
    attempts: week.length,
    solved: solvedThisWeek.size,
    accuracy: thisAccuracy,
    previousAccuracy: lastAccuracy,
    activeDays,
    newSolved: [...solvedThisWeek].filter((id) => !solvedBefore.has(id)).length,
    topics: [...topics.values()].sort((a, b) => b.attempts - a.attempts),
    mistakes: [...stillWrong].slice(0, 8).map((id) => ({ id, title: byTask.get(id)?.title ?? id })),
    readiness,
    daysLeft,
    target: goal.competition?.name ?? goal.subjectName,
    recommendations,
  }
}
