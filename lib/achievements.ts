import type { ProgressAnalytics } from '@/lib/types'

export type Achievement = {
  name: string
  description: string
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
      name: 'First solution',
      description: 'Solve your first task',
      earned: analytics.correctAnswers >= 1,
      progress: goal(analytics.correctAnswers, 1),
    },
    {
      name: 'Ten down',
      description: 'Solve 10 tasks',
      earned: analytics.correctAnswers >= 10,
      progress: goal(analytics.correctAnswers, 10),
    },
    {
      name: 'Century club',
      description: 'Solve 100 tasks',
      earned: analytics.correctAnswers >= 100,
      progress: goal(analytics.correctAnswers, 100),
    },
    {
      name: '7-day streak',
      description: 'Practice every day for a week',
      earned: analytics.activeStreak >= 7,
      progress: goal(analytics.activeStreak, 7),
    },
    {
      name: 'Marathon',
      description: 'Practice every day for a month',
      earned: analytics.activeStreak >= 30,
      progress: goal(analytics.activeStreak, 30),
    },
    {
      name: 'Sharpshooter',
      description: '10 correct submissions in a row',
      earned: analytics.longestCorrectRun >= 10,
      progress: goal(analytics.longestCorrectRun, 10),
    },
    {
      name: 'Topic master',
      description: '90% accuracy in a topic, over at least 5 attempts',
      earned: bestTopic >= 90,
      progress: goal(bestTopic, 90),
    },
    {
      name: 'Broad base',
      description: 'Attempt tasks in 5 different topics',
      earned: analytics.topics.length >= 5,
      progress: goal(analytics.topics.length, 5),
    },
    // Tied to the same derived XP the dashboard shows, so the two can never
    // tell the student different things.
    {
      name: 'Level 5',
      description: 'Reach level 5',
      earned: analytics.xp.level >= 5,
      progress: goal(analytics.xp.level, 5),
    },
    {
      name: 'Level 10',
      description: 'Reach level 10',
      earned: analytics.xp.level >= 10,
      progress: goal(analytics.xp.level, 10),
    },
    {
      name: 'Thousand club',
      description: 'Earn 1,000 XP',
      earned: analytics.xp.total >= 1000,
      progress: goal(analytics.xp.total, 1000),
    },
  ]
}
