import Link from 'next/link'
import { CalendarDays, CheckCircle2, CircleDot, Clock } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { getAllCompetitions } from '@/lib/supabase/competitions'
import { getGoal } from '@/lib/supabase/queries'
import { buildCalendar, slotMonth, type CalendarEntry } from '@/lib/olympiad-calendar'
import { formatDate, type Locale } from '@/lib/i18n/config'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Olympiad calendar') }
}

const SUBJECTS = ['Mathematics', 'Physics', 'Informatics'] as const

function monthName(month: number, locale: Locale) {
  return formatDate(new Date(Date.UTC(2026, month - 1, 15)), locale, { month: 'long' })
}

/**
 * Every olympiad of the season by month: which are still ahead (and open for
 * registration) and which have passed. ?subject= narrows to one subject; the
 * student's own subject is the default.
 */
export default async function OlympiadCalendarPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const [t, locale, competitions, goal, params] = await Promise.all([getT(), getLocale(), getAllCompetitions(), getGoal(), searchParams])
  const subject = params.subject === 'all' ? null : (SUBJECTS as readonly string[]).includes(params.subject ?? '') ? params.subject! : goal.subjectName
  const today = new Date().toISOString().slice(0, 10)
  const { season, entries } = buildCalendar(subject ? competitions.filter((entry) => entry.subject === subject || entry.subject === null) : competitions, today)
  const dated = entries.filter((entry) => entry.slot !== null)
  const undated = entries.filter((entry) => entry.slot === null)
  const ahead = dated.filter((entry) => entry.status !== 'past')
  const passed = dated.filter((entry) => entry.status === 'past')

  const label = (entry: CalendarEntry) => {
    if (!entry.date) return t('Dates on the official page')
    if (entry.exact) {
      const start = formatDate(new Date(`${entry.date}T00:00:00Z`), locale, { day: 'numeric', month: 'long' })
      const end = entry.competition.endsOn && entry.competition.endsOn !== entry.date
        ? ` – ${formatDate(new Date(`${entry.competition.endsOn}T00:00:00Z`), locale, { day: 'numeric', month: 'long' })}`
        : ''
      return start + end
    }
    return t('usually in {month}', { month: monthName(Number(entry.date.slice(5, 7)), locale) })
  }

  const Row = ({ entry }: { entry: CalendarEntry }) => (
    <li className="flex flex-wrap items-start justify-between gap-2 py-2.5">
      <div className="min-w-0">
        <Link href={entry.competition.slug ? `/olympiads/${entry.competition.slug}` : '/olympiads'} className={cn('font-medium hover:underline', entry.status === 'past' && 'text-muted-foreground')}>
          {entry.competition.name}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {[entry.competition.subject ? t(entry.competition.subject) : null, entry.competition.level ? t(entry.competition.level) : null].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="shrink-0 text-right text-xs">
        <p className={cn('font-medium', entry.exact ? '' : 'text-muted-foreground')}>{label(entry)}</p>
        {entry.status === 'open' && entry.competition.registrationDeadline ? (
          <p className="text-success">{t('registration until {date}', { date: formatDate(new Date(`${entry.competition.registrationDeadline}T00:00:00Z`), locale, { day: 'numeric', month: 'long' }) })}</p>
        ) : entry.status === 'past' ? (
          <p className="text-muted-foreground">{t('already held this season')}</p>
        ) : entry.exact ? null : (
          <p className="text-muted-foreground">{t('estimate — check the official page')}</p>
        )}
      </div>
    </li>
  )

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <BackLink href="/olympiads">{t('Olympiads')}</BackLink>
      <PageHeader
        title={t('Olympiad calendar')}
        description={t('Season {from}/{to}: what you can still take part in and what has already been held.', { from: season, to: season + 1 })}
      />

      <nav className="flex flex-wrap gap-2 text-sm" aria-label={t('Subject')}>
        {[...SUBJECTS, 'all'].map((value) => {
          const active = value === 'all' ? subject === null : subject === value
          return (
            <Link
              key={value}
              href={`/olympiads/calendar?subject=${value}`}
              className={cn('rounded-full border px-3 py-1', active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-foreground/[0.04]')}
            >
              {value === 'all' ? t('All subjects') : t(value)}
            </Link>
          )
        })}
      </nav>

      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <h2 className="flex items-center gap-2 font-medium"><CircleDot className="size-4 text-success" /> {t('Still ahead — {n}', { n: ahead.length })}</h2>
        {ahead.length ? (
          <div className="mt-2">
            {Array.from(new Set(ahead.map((entry) => entry.slot!))).map((slot) => (
              <div key={slot} className="mt-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{monthName(slotMonth(slot), locale)}</h3>
                <ul className="divide-y divide-border">
                  {ahead.filter((entry) => entry.slot === slot).map((entry) => <Row key={entry.competition.id} entry={entry} />)}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t('Nothing else is scheduled this season.')}</p>
        )}
      </section>

      {passed.length ? (
        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <h2 className="flex items-center gap-2 font-medium"><CheckCircle2 className="size-4 text-muted-foreground" /> {t('Already held — {n}', { n: passed.length })}</h2>
          <ul className="mt-2 divide-y divide-border">
            {passed.map((entry) => <Row key={entry.competition.id} entry={entry} />)}
          </ul>
        </section>
      ) : null}

      {undated.length ? (
        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <h2 className="flex items-center gap-2 font-medium"><Clock className="size-4 text-muted-foreground" /> {t('Date not known yet — {n}', { n: undated.length })}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('The organiser has not announced the date, or it changes every year. The official page has it first.')}</p>
          <ul className="mt-2 divide-y divide-border">
            {undated.map((entry) => <Row key={entry.competition.id} entry={entry} />)}
          </ul>
        </section>
      ) : null}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5" /> {t('Exact dates are shown in bold. “Usually in …” is when the olympiad is normally held, not a confirmed date.')}
      </p>
    </div>
  )
}
