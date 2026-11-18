import type { Competition } from '@/lib/types'

/**
 * The season's olympiads on one calendar, September to August.
 *
 * An exact date set by an admin always wins and is shown as a date. Without
 * one, the month the olympiad is usually held places it as "usually in March"
 * — an estimate, labelled as such, never a date. Olympiads with neither are
 * listed apart, with the official page as the source of the date.
 */
export type CalendarStatus = 'past' | 'upcoming' | 'open' | 'undated'

export type CalendarEntry = {
  competition: Competition
  /** Month index in the season: 0 = September … 11 = August. */
  slot: number | null
  exact: boolean
  /** First day of the sitting, or of its usual month. */
  date: string | null
  status: CalendarStatus
}

export function seasonStart(today: string) {
  const [year, month] = today.split('-').map(Number)
  return month >= 9 ? year : year - 1
}

const pad = (value: number) => String(value).padStart(2, '0')

export function buildCalendar(competitions: Competition[], today: string): { season: number; entries: CalendarEntry[] } {
  const season = seasonStart(today)
  const from = `${season}-09-01`
  const to = `${season + 1}-08-31`
  const entries = competitions.flatMap((competition): CalendarEntry[] => {
    if (competition.startsOn && competition.startsOn >= from && competition.startsOn <= to) {
      const month = Number(competition.startsOn.slice(5, 7))
      const end = competition.endsOn ?? competition.startsOn
      const status: CalendarStatus = end < today
        ? 'past'
        : competition.registrationDeadline && competition.registrationDeadline >= today ? 'open' : 'upcoming'
      return [{ competition, slot: (month + 3) % 12, exact: true, date: competition.startsOn, status }]
    }
    if (competition.typicalMonth) {
      const month = competition.typicalMonth
      const year = month >= 9 ? season : season + 1
      const date = `${year}-${pad(month)}-01`
      const monthEnd = `${year}-${pad(month)}-31`
      // "Usually in March" is past only once March is over, upcoming before.
      return [{ competition, slot: (month + 3) % 12, exact: false, date, status: monthEnd < today ? 'past' : 'upcoming' }]
    }
    return [{ competition, slot: null, exact: false, date: null, status: 'undated' }]
  })
  entries.sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99) || (a.date ?? '').localeCompare(b.date ?? '') || a.competition.name.localeCompare(b.competition.name))
  return { season, entries }
}

/** Season month index (0 = September) to calendar month (1-12). */
export function slotMonth(slot: number) {
  return ((slot + 8) % 12) + 1
}
