import type { PreparationInput } from '@/lib/preparation'

export type PreparationPhase = 'foundation' | 'strengthening' | 'competition' | 'taper' | 'rest'
export type PreparationCalendarDay = {
  date: string
  phase: PreparationPhase
  /** Remaining agreed capacity, after recorded work/reservations; never a recommendation to increase it. */
  capacityMinutes: number
  studyDay: boolean
  daysLeft: number
}

const DAY = 86_400_000
const timestamp = (date: string) => Date.parse(`${date.slice(0, 10)}T00:00:00Z`)
const minutes = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(360, Math.floor(value!))) : fallback

/** Calendar phases are tied to the saved goal start, so opening the app does not restart the base phase. */
export function preparationPhase(date: string, targetDate: string, goalStart: string = date): PreparationPhase {
  const current = timestamp(date)
  const target = timestamp(targetDate)
  const left = Math.round((target - current) / DAY)
  if (left <= 2) return 'rest'
  if (left <= 5) return 'taper'
  let start = timestamp(goalStart)
  if (!Number.isFinite(start) || start >= target || target - start > 730 * DAY) start = current
  const progress = Math.max(0, (current - start) / Math.max(DAY, target - start))
  if (left <= 14 || progress >= 0.72) return 'competition'
  if (progress >= 0.35) return 'strengthening'
  return 'foundation'
}

/** Every date up to (but not including) the event: study, off days, taper and full rest. */
export function preparationCalendar(input: Pick<PreparationInput, 'today' | 'targetDate' | 'goalStart' | 'preferences' | 'reservedMinutesByDate' | 'day'>): PreparationCalendarDay[] {
  const start = timestamp(input.today)
  const target = timestamp(input.targetDate)
  if (!Number.isFinite(start) || !Number.isFinite(target) || target <= start) return []
  const normalMinutes = minutes(input.preferences.sessionMinutes, 0)
  const goalStart = Number.isFinite(timestamp(input.goalStart)) && target - timestamp(input.goalStart) <= 730 * DAY
    ? input.goalStart : input.today
  const adapted = input.day.reported && ((input.day.mental > 0 && input.day.mental <= 2) ||
    (input.day.sleepHours > 0 && input.day.sleepHours < 6) || input.day.loadMinutes >= 480)
  return Array.from({ length: Math.min(730, Math.ceil((target - start) / DAY)) }, (_, offset) => {
    const current = start + offset * DAY
    const date = new Date(current).toISOString().slice(0, 10)
    const weekday = new Date(current).getUTCDay()
    const studyDay = input.preferences.weekdays.includes(weekday)
    const phase = preparationPhase(date, input.targetDate, goalStart)
    const agreed = minutes(input.preferences.minutesByWeekday?.[String(weekday)], normalMinutes)
    const cap = !studyDay || phase === 'rest' ? 0 : phase === 'taper' ? Math.min(30, Math.floor(agreed / 2)) : agreed
    const adjusted = offset === 0 && adapted ? Math.floor(cap / 2) : cap
    const reserved = Math.max(0, Math.ceil(input.reservedMinutesByDate?.[date] ?? 0))
    return { date, phase, capacityMinutes: Math.max(0, adjusted - reserved), studyDay, daysLeft: Math.round((target - current) / DAY) }
  })
}
