import type { CatalogueTask, ProgressAnalytics } from '@/lib/types'

/**
 * Picks the next task to show on the dashboard.
 *
 * The dashboard used to hard-code "Two masses and a pulley" as the recommended
 * task for every user and every session, while this module sat unimported.
 */
export function recommendTask(
  tasks: CatalogueTask[],
  analytics: ProgressAnalytics,
): CatalogueTask | null {
  const unsolved = tasks.filter((task) => !task.solved)
  if (unsolved.length === 0) return null

  const masteryByTopic = new Map(analytics.topics.map((item) => [item.topic, item]))

  const score = (task: CatalogueTask) => {
    const topic = masteryByTopic.get(task.topic)

    // Nothing attempted in this topic yet: prefer it, and start gently.
    if (!topic) return 80 + Math.max(0, 4 - task.difficulty)

    const weakness = 100 - topic.mastery
    // Comfortable in this topic? Push the difficulty up. Struggling? Stay near
    // the middle of the range rather than piling on the hardest problems.
    const difficultyFit =
      topic.mastery >= 85 && topic.attempts >= 3
        ? task.difficulty * 6
        : -Math.abs(task.difficulty - 3) * 4

    // A task already attempted and not yet solved is worth returning to, but
    // not ahead of untouched material in the same weak topic.
    const revisit = task.attempts > 0 ? -8 : 0

    return weakness + difficultyFit + revisit
  }

  return [...unsolved].sort((a, b) => score(b) - score(a))[0] ?? null
}
