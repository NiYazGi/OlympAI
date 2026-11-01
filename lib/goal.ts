import type { Dictionary } from '@/lib/i18n/dictionaries'
import type { LearningPath } from '@/lib/path'

export type Workload = 'light' | 'steady' | 'demanding' | 'unrealistic'

export type GoalPlan = {
  daysLeft: number
  weeksLeft: number
  /** Tasks on the path still unsolved. */
  remaining: number
  /** The rhythm the student chose, in problems a week. */
  tasksPerWeek: number
  /** Weeks the route needs at that rhythm. */
  weeksNeeded: number
  /** Whether the route fits before the date. */
  fits: boolean
  minutesPerWeek: number
  workload: Workload
  /** Pace the student has actually held over the last week, in tasks. */
  currentPace: number
  onTrack: boolean
  /** Stage names with the week by which each should be cleared. */
  /** `due` is the teacher's date for the stage, when the class has one. */
  milestones: { stage: string; byWeek: number; tasks: number; due: string | null }[]
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
  // An accuracy that is not a number is an accuracy we do not have. This is
  // the last function before a percentage is printed into a ring, and a ring
  // reading "NaN%" is worse than one reading the coverage score alone.
  const accuracy = Number.isFinite(accuracyPercent) ? accuracyPercent : null

  if (path.totalTasks === 0) return { percent: 0, coverage: 0, quality: accuracy }
  const coverage = path.solvedTasks / path.totalTasks
  const quality = accuracy === null ? null : accuracy / 100
  const weighted = quality === null ? 0.6 : 0.6 + 0.4 * quality
  return {
    percent: Math.round(coverage * weighted * 100),
    coverage: Math.round(coverage * 100),
    quality: accuracy,
  }
}

const MINUTES_FALLBACK = 20

/** Workload bands, in tasks per week. */
/**
 * The rhythm the student said they would keep, in problems a week.
 *
 * One problem a session. An olympiad problem is twenty minutes on a good day
 * and ninety on a real one, so a session is a problem — counting two would be
 * a plan written for somebody else.
 */
export function perWeekFor(intensity: string | null): number {
  if (intensity === '3 short sessions a week') return 3
  if (intensity === 'Daily intensive practice') return 10
  return 5
}

/**
 * How comfortably the route fits before the date.
 *
 * This used to describe the weekly load, which was computed by dividing the
 * work left by the weeks left — so the number was whatever the date demanded,
 * and the band said "unrealistic" about a figure the app had invented. The
 * pace is the student's own now, and the band is about the fit: the question a
 * plan exists to answer is whether this gets done in time, not how large a
 * number division produced.
 */
function bandFor(weeksNeeded: number, weeksLeft: number): Workload {
  const share = weeksNeeded / Math.max(1, weeksLeft)
  if (share <= 0.6) return 'light'
  if (share <= 1) return 'steady'
  if (share <= 1.3) return 'demanding'
  return 'unrealistic'
}

/** The band's name and the sentence under it, in the reader's language. */
export function workloadCopy(workload: Workload, t: Dictionary): { label: string; note: string } {
  return t.goal.workload[workload]
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
  intensity: string | null = null,
  today = new Date(),
): GoalPlan {
  const target = new Date(`${targetDate}T00:00:00Z`)
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const daysLeft = Math.max(0, Math.round((target.getTime() - start) / 86_400_000))
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7))

  // What the route still asks for, not what the library still holds. With
  // 1625 mathematics problems the second number put a student 95 problems a
  // week behind on the day they started.
  const remainingTasks = path.stages.flatMap((stage) => stage.todo)
  const remaining = remainingTasks.length
  const tasksPerWeek = perWeekFor(intensity)
  const weeksNeeded = remaining === 0 ? 0 : Math.ceil(remaining / tasksPerWeek)

  const meanMinutes =
    remainingTasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? MINUTES_FALLBACK), 0) /
    (remaining || 1)

  // Milestones walk the stages in order and spread them across the weeks left,
  // in proportion to how much work each stage still holds.
  let consumed = 0
  const milestones = path.stages
    .map((stage) => {
      const open = stage.todo.length
      if (open === 0) return null
      consumed += open
      return {
        stage: stage.topic,
        tasks: open,
        // Weeks at the student's own pace, not weeks carved out of the time
        // remaining. A milestone that moves when the date moves is a deadline,
        // not a plan.
        byWeek: Math.max(1, Math.ceil(consumed / tasksPerWeek)),
        // A teacher's date replaces the estimate on screen. The estimate is
        // still computed: it is what says whether the date can be met.
        due: stage.due,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  return {
    daysLeft,
    weeksLeft,
    remaining,
    tasksPerWeek,
    weeksNeeded,
    fits: weeksNeeded <= weeksLeft,
    minutesPerWeek: Math.round(tasksPerWeek * meanMinutes),
    workload: bandFor(weeksNeeded, weeksLeft),
    currentPace: attemptsLastWeek,
    onTrack: attemptsLastWeek >= tasksPerWeek,
    milestones,
  }
}
