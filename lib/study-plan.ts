import type { Profile, ProgressAnalytics } from '@/lib/types'

export type PlannedSession = {
  day: string
  /** ISO date, so the caller can tell past from future without guessing. */
  date: string
  subject: string
  topic: string
  minutes: number
  done: boolean
  reason: string
}

export type StudyPlan = {
  sessions: PlannedSession[]
  sessionsPerWeek: number
  completed: number
  /** Null when there is not enough history to choose topics yet. */
  basis: string | null
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const INTENSITY: Record<string, { sessions: number; minutes: number }> = {
  '3 short sessions a week': { sessions: 3, minutes: 30 },
  '5 focused sessions a week': { sessions: 5, minutes: 45 },
  'Daily intensive practice': { sessions: 7, minutes: 60 },
}

/**
 * Builds the weekly plan from the student's own history.
 *
 * The page previously rendered a seven-row constant array — the same subjects,
 * the same minute counts and the same four "completed" ticks for every account
 * — under the heading "a personalized schedule generated from your performance".
 */
export function buildStudyPlan(
  profile: Profile | null,
  analytics: ProgressAnalytics,
  availableTopics: { topic: string; subject: string }[],
): StudyPlan {
  const intensity = INTENSITY[profile?.training_intensity ?? ''] ?? { sessions: 4, minutes: 40 }

  // Weakest topics first, then anything the student has never touched, then the
  // rest — so the plan always fills even on a brand-new account.
  const attempted = new Set(analytics.topics.map((item) => item.topic))
  const weakest = analytics.topics
    .filter((item) => item.mastery < 85)
    .map((item) => ({
      topic: item.topic,
      subject: availableTopics.find((entry) => entry.topic === item.topic)?.subject ?? 'Practice',
      reason: `${item.mastery}% accuracy over ${item.attempts} attempt${item.attempts === 1 ? '' : 's'}`,
    }))
  const untouched = availableTopics
    .filter((entry) => !attempted.has(entry.topic))
    .map((entry) => ({ ...entry, reason: 'Not attempted yet' }))
  const remainder = availableTopics
    .filter((entry) => attempted.has(entry.topic))
    .map((entry) => ({ ...entry, reason: 'Keep it warm' }))

  const queue = [...weakest, ...untouched, ...remainder]
  if (queue.length === 0) return { sessions: [], sessionsPerWeek: intensity.sessions, completed: 0, basis: null }

  // Monday of the current week, in UTC, to match how attempts are bucketed.
  const today = new Date()
  const monday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  )
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))

  // Spread the sessions across the week instead of front-loading them.
  const step = 7 / intensity.sessions
  const activeDays = new Set(
    analytics.recentActivity.filter((entry) => entry.problems > 0).map((entry) => entry.day),
  )

  const sessions = Array.from({ length: intensity.sessions }, (_, index) => {
    const dayIndex = Math.min(6, Math.round(index * step))
    const date = new Date(monday)
    date.setUTCDate(monday.getUTCDate() + dayIndex)
    const choice = queue[index % queue.length]
    return {
      day: WEEKDAYS[dayIndex],
      date: date.toISOString().slice(0, 10),
      subject: choice.subject,
      topic: choice.topic,
      minutes: intensity.minutes,
      done:
        date <= today &&
        activeDays.has(date.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })),
      reason: choice.reason,
    }
  })

  return {
    sessions,
    sessionsPerWeek: intensity.sessions,
    completed: sessions.filter((session) => session.done).length,
    basis: analytics.hasData
      ? `${analytics.totalAttempts} attempt${analytics.totalAttempts === 1 ? '' : 's'} across ${analytics.topics.length} topic${analytics.topics.length === 1 ? '' : 's'}`
      : null,
  }
}
