import { methodsForTask, TASK_METHODS } from '@/lib/task-methods'
import type { LadderStage } from '@/lib/ladder'

export type ProgressAttempt = { id: string; task_id: string; is_correct: boolean; score: number; created_at: string; mock_test_id: string | null }
export type ProgressPaper = { id: string; task_ids: string[]; score_percent: number | null; submitted_at: string | null }
export type TopicMetrics = ReturnType<typeof buildTopicMetrics>

/** Subject aggregates never enter this function. Evidence joins only by exact IDs. */
export function buildTopicMetrics(input: {
  topicSlug: string
  taskIds: string[]
  stages: LadderStage[]
  attempts: ProgressAttempt[]
  papers: ProgressPaper[]
}) {
  const taskIds = new Set(input.taskIds)
  const attempts = input.attempts.filter((row) => taskIds.has(row.task_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const routeStages = input.stages.filter((stage) => stage.key !== 'sit')
  const available = routeStages.filter((stage) => stage.state !== 'empty')
  const total = available.reduce((sum, stage) => sum + (stage.actions?.total ?? 0), 0)
  const completed = available.reduce((sum, stage) => sum + (stage.actions?.completed ?? 0), 0)
  const skills = TASK_METHODS.filter((method) => method.topicSlug === input.topicSlug).map((method) => {
    const evidence = attempts.filter((row) => methodsForTask(row.task_id).some((link) => link.id === method.id))
    // Repeated submissions and partial scores do not create additional skill evidence.
    const successfulTasks = new Set(evidence.filter((row) => row.is_correct).map((row) => row.task_id))
    return { id: method.id, name: method.name, confirmed: successfulTasks.size >= 3, successfulTasks: successfulTasks.size, evidence }
  })
  return {
    route: { completed, total, percent: total ? Math.round(completed / total * 100) : 0 },
    coverage: { available: available.length, total: routeStages.length, ready: available.length > 0, complete: available.length === routeStages.length && available.length > 0 },
    skills,
    attempts,
    unclassifiedAttempts: attempts.filter((row) => methodsForTask(row.task_id).length === 0).length,
    papers: input.papers.filter((paper) => paper.submitted_at && paper.task_ids.some((id) => taskIds.has(id)))
      .sort((a, b) => b.submitted_at!.localeCompare(a.submitted_at!)),
  }
}
