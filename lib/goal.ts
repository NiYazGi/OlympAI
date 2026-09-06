import type { LearningPath } from '@/lib/path'

export type Workload = 'light' | 'steady' | 'demanding' | 'unrealistic'

export type GoalPlan = {
  daysLeft: number
  weeksLeft: number
  /** Tasks on the path still unsolved. */
  remaining: number
  tasksPerWeek: number
  minutesPerWeek: number
  workload: Workload
  /** Pace the student has actually held over the last week, in tasks. */
  currentPace: number
  onTrack: boolean
  /** Stage names with the week by which each should be cleared. */
  milestones: { stage: string; byWeek: number; tasks: number }[]
}

export type Readiness = {
  percent: number
  /** Share of the subject's tasks solved, 0-100. */
  coverage: number
  /** Accuracy across attempts in the subject, 0-100. Null before any attempt. */
  quality: number | null
}

/**
 * How close the student is to being ready.
 *
 * Coverage alone would call someone ready for scraping through every task once;
 * accuracy alone would call someone ready for two perfect answers. The score
 * multiplies them, with accuracy weighted at 40% so that early sloppy work
 * still registers as progress rather than pinning the number near zero.
 *
 * Both parts are returned so the UI can show the arithmetic instead of a
 * number the student has to take on faith.
 */
export function readiness(path: LearningPath, accuracyPercent: number | null): Readiness {
  if (path.totalTasks === 0) return { percent: 0, coverage: 0, quality: accuracyPercent }
  const coverage = path.solvedTasks / path.totalTasks
  const quality = accuracyPercent === null ? null : accuracyPercent / 100
  const weighted = quality === null ? 0.6 : 0.6 + 0.4 * quality
  return {
    percent: Math.round(coverage * weighted * 100),
    coverage: Math.round(coverage * 100),
    quality: accuracyPercent,
  }
}

const MINUTES_FALLBACK = 20

/** Workload bands, in tasks per week. */
function bandFor(tasksPerWeek: number): Workload {
  if (tasksPerWeek <= 3) return 'light'
  if (tasksPerWeek <= 7) return 'steady'
  if (tasksPerWeek <= 14) return 'demanding'
  return 'unrealistic'
}

export const WORKLOAD_COPY: Record<Workload, { label: string; note: string }> = {
  light: {
    label: 'Light',
    note: 'Comfortable. You could aim at something harder, or bring the date forward.',
  },
  steady: {
    label: 'Steady',
    note: 'A sustainable rhythm for most students alongside school.',
  },
  demanding: {
    label: 'Demanding',
    note: 'Doable, but it will need most of your free evenings.',
  },
  unrealistic: {
    label: 'Very tight',
    note: 'This pace rarely survives contact with a school term. Consider a later date, or a narrower subject.',
  },
}

/**
 * Turns "this olympiad, by this date" into a weekly load and a set of dated
 * milestones. Everything derives from the path, so adding tasks to the library
 * re-plans automatically instead of leaving a stale schedule behind.
 */
export function planForGoal(
  path: LearningPath,
  targetDate: string,
  attemptsLastWeek: number,
  today = new Date(),
): GoalPlan {
  const target = new Date(`${targetDate}T00:00:00Z`)
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const daysLeft = Math.max(0, Math.round((target.getTime() - start) / 86_400_000))
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7))

  const remainingTasks = path.stages.flatMap((stage) =>
    stage.tasks.filter((task) => !task.solved),
  )
  const remaining = remainingTasks.length
  const tasksPerWeek = remaining === 0 ? 0 : Math.ceil(remaining / weeksLeft)

  const meanMinutes =
    remainingTasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? MINUTES_FALLBACK), 0) /
    (remaining || 1)

  // Milestones walk the stages in order and spread them across the weeks left,
  // in proportion to how much work each stage still holds.
  let consumed = 0
  const milestones = path.stages
    .map((stage) => {
      const open = stage.tasks.filter((task) => !task.solved).length
      if (open === 0) return null
      consumed += open
      return {
        stage: stage.topic,
        tasks: open,
        byWeek: Math.max(1, Math.ceil((consumed / (remaining || 1)) * weeksLeft)),
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  return {
    daysLeft,
    weeksLeft,
    remaining,
    tasksPerWeek,
    minutesPerWeek: Math.round(tasksPerWeek * meanMinutes),
    workload: bandFor(tasksPerWeek),
    currentPace: attemptsLastWeek,
    onTrack: attemptsLastWeek >= tasksPerWeek,
    milestones,
  }
}
