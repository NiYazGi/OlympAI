import type { ProgressAnalytics } from '@/lib/types'

export type AchievementKey =
  | 'firstSolution'
  | 'tenDown'
  | 'century'
  | 'week'
  | 'marathon'
  | 'sharpshooter'
  | 'topicMaster'
  | 'broadBase'
  | 'level5'
  | 'level10'
  | 'thousand'

export type Achievement = {
  key: AchievementKey
  earned: boolean
  /** Progress toward the goal, 0-100, for the ones that are countable. */
  progress: number
}

/**
 * Derived from the account's own attempts.
 *
 * The profile page used to render a constant list in which five of eight badges
 * were marked earned for everybody, including an account that had never
 * submitted anything.
 */
export function buildAchievements(analytics: ProgressAnalytics): Achievement[] {
  const bestTopic = analytics.topics.reduce(
    (best, topic) => (topic.attempts >= 5 && topic.mastery > best ? topic.mastery : best),
    0,
  )

  const goal = (value: number, target: number) =>
    Math.min(100, Math.round((value / target) * 100))

  return [
    {
      key: 'firstSolution',
      earned: analytics.correctAnswers >= 1,
      progress: goal(analytics.correctAnswers, 1),
    },
    {
      key: 'tenDown',
      earned: analytics.correctAnswers >= 10,
      progress: goal(analytics.correctAnswers, 10),
    },
    {
      key: 'century',
      earned: analytics.correctAnswers >= 100,
      progress: goal(analytics.correctAnswers, 100),
    },
    {
      key: 'week',
      earned: analytics.activeStreak >= 7,
      progress: goal(analytics.activeStreak, 7),
    },
    {
      key: 'marathon',
      earned: analytics.activeStreak >= 30,
      progress: goal(analytics.activeStreak, 30),
    },
    {
      key: 'sharpshooter',
      earned: analytics.longestCorrectRun >= 10,
      progress: goal(analytics.longestCorrectRun, 10),
    },
    {
      key: 'topicMaster',
      earned: bestTopic >= 90,
      progress: goal(bestTopic, 90),
    },
    {
      key: 'broadBase',
      earned: analytics.topics.length >= 5,
      progress: goal(analytics.topics.length, 5),
    },
    // Tied to the same derived XP the dashboard shows, so the two can never
    // tell the student different things.
    {
      key: 'level5',
      earned: analytics.xp.level >= 5,
      progress: goal(analytics.xp.level, 5),
    },
    {
      key: 'level10',
      earned: analytics.xp.level >= 10,
      progress: goal(analytics.xp.level, 10),
    },
    {
      key: 'thousand',
      earned: analytics.xp.total >= 1000,
      progress: goal(analytics.xp.total, 1000),
    },
  ]
}
