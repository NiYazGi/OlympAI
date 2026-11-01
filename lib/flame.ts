/**
 * The flame: how many days in a row the app has been opened.
 *
 * Pure, so the server's first render and the browser's update after recording
 * today's visit describe the same thing in the same words.
 */
export type Flame = {
  /** Days in a row, ending today or yesterday. Zero when the run went out. */
  current: number
  /** The longest run there has ever been. */
  best: number
  /** Whether today is already counted. Until it is, the flame is unlit. */
  lit: boolean
  /** The last seven days, oldest first, ending on `today`. */
  week: { day: string; visited: boolean }[]
}

export const NO_FLAME: Flame = { current: 0, best: 0, lit: false, week: [] }

/** YYYY-MM-DD, moved by whole days, in UTC so no clock shift can move it twice. */
export function addDays(day: string, by: number) {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + by)
  return date.toISOString().slice(0, 10)
}

/** The browser's own calendar day, which is the one a student lives in. */
export function localDay(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function weekEnding(today: string, visited: Set<string>) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(today, index - 6)
    return { day, visited: visited.has(day) }
  })
}

/** Milestones worth saying out loud, as Duolingo does. Everything else is just +1. */
export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365]
