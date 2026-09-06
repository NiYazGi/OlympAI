import type { CatalogueTask } from '@/lib/types'

export type PathTask = {
  id: string
  title: string
  difficulty: number
  estimatedMinutes: number | null
  solved: boolean
  attempts: number
}

export type PathStage = {
  topic: string
  tasks: PathTask[]
  solved: number
  total: number
  /** Share of the stage's tasks solved, 0-100. */
  percent: number
  state: 'done' | 'current' | 'locked'
  /** First unsolved task in the stage, if the stage is open. */
  next: PathTask | null
}

export type LearningPath = {
  subject: string | null
  stages: PathStage[]
  totalTasks: number
  solvedTasks: number
  percent: number
  /** The single task to open right now, across the whole path. */
  next: PathTask | null
}

/** A stage opens once most of the one before it is behind you. */
const UNLOCK_THRESHOLD = 0.6

/**
 * Builds an ordered route through one subject.
 *
 * Stage order is the mean difficulty of each topic's tasks, so the path follows
 * the library rather than a hand-written syllabus. That is deliberate: the
 * catalogue is about to grow by two orders of magnitude, and a curriculum typed
 * out by hand would be stale the day after the next import.
 */
export function buildPath(tasks: CatalogueTask[], subject: string | null): LearningPath {
  const scoped = subject ? tasks.filter((task) => task.subject === subject) : tasks
  if (scoped.length === 0) {
    return { subject, stages: [], totalTasks: 0, solvedTasks: 0, percent: 0, next: null }
  }

  const byTopic = new Map<string, CatalogueTask[]>()
  for (const task of scoped) {
    const list = byTopic.get(task.topic) ?? []
    list.push(task)
    byTopic.set(task.topic, list)
  }

  const meanDifficulty = (list: CatalogueTask[]) =>
    list.reduce((sum, task) => sum + task.difficulty, 0) / list.length

  const ordered = [...byTopic.entries()].sort(([aName, a], [bName, b]) => {
    const diff = meanDifficulty(a) - meanDifficulty(b)
    // Stable across renders when two topics tie.
    return diff !== 0 ? diff : aName.localeCompare(bName)
  })

  let previousCleared = true
  const stages: PathStage[] = ordered.map(([topic, list]) => {
    const tasks = list
      .map((task) => ({
        id: task.id,
        title: task.title,
        difficulty: task.difficulty,
        estimatedMinutes: task.estimatedMinutes,
        solved: task.solved,
        attempts: task.attempts,
      }))
      .sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title))

    const solved = tasks.filter((task) => task.solved).length
    const percent = Math.round((solved / tasks.length) * 100)
    const state: PathStage['state'] =
      solved === tasks.length ? 'done' : previousCleared ? 'current' : 'locked'

    // Evaluated after this stage's own state, so the gate reflects the stage
    // before it rather than itself.
    previousCleared = solved / tasks.length >= UNLOCK_THRESHOLD

    return {
      topic,
      tasks,
      solved,
      total: tasks.length,
      percent,
      state,
      next: state === 'locked' ? null : (tasks.find((task) => !task.solved) ?? null),
    }
  })

  const totalTasks = scoped.length
  const solvedTasks = scoped.filter((task) => task.solved).length

  return {
    subject,
    stages,
    totalTasks,
    solvedTasks,
    percent: Math.round((solvedTasks / totalTasks) * 100),
    next: stages.find((stage) => stage.state === 'current')?.next ?? null,
  }
}
