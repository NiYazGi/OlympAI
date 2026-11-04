import { Reveal } from '@/components/reveal'
import Link from 'next/link'
import { CalendarDays, ExternalLink, Flag, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { RegistrationButton } from '@/components/competitions/registration-button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/empty-state'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { getCompetitions } from '@/lib/supabase/competitions'
import { OlympiadBrowser } from '@/components/competitions/olympiad-browser'
import { cardClass } from '@/lib/utils'
import { getLocale, getT } from '@/lib/i18n/server'
import { formatDate, type Locale, type Translate } from '@/lib/i18n/config'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Olympiads') }
}
export const dynamic = 'force-dynamic'

function formatRange(startsOn: string | null, endsOn: string | null, t: Translate, locale: Locale) {
  // Catalogue entries carry no date: the sitting moves every year and belongs
  // to the official site, not to this table.
  // "Date set by the organiser" read as "they will tell you later". They will
  // not tell you here — the date is on their site, and this table has never
  // claimed to know it.
  if (!startsOn) return t('Dates on the official page')
  const start = new Date(`${startsOn}T00:00:00Z`)
  const options = { month: 'short', day: 'numeric', timeZone: 'UTC' } as const
  if (!endsOn || endsOn === startsOn) return formatDate(start, locale, options)
  const end = new Date(`${endsOn}T00:00:00Z`)
  return `${formatDate(start, locale, options)} – ${formatDate(end, locale, options)}`
}

export default async function OlympiadsPage() {
  const t = await getT()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader
        title={t('Olympiads')}
        description={t('Upcoming competitions and your preparation for each.')}
      />
      <Reveal
        fallback={
          <>
            <PendingRegion label={t('Loading competitions')} />
            <BlockSkeleton className={`${cardClass} h-40`} />
            <div className="grid gap-5 md:grid-cols-2">
              <BlockSkeleton className={`${cardClass} h-56`} />
              <BlockSkeleton className={`${cardClass} h-56`} />
            </div>
          </>
        }
      >
        <Competitions />
      </Reveal>
    </div>
  )
}

async function Competitions() {
  const t = await getT()
  const locale = await getLocale()

  const competitions = await getCompetitions()
  const next = competitions[0]

  if (competitions.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title={t('No competitions listed yet')}
        body={t('This page shows real competitions and how ready you are for each, based on your accuracy in that subject. Nothing has been added yet.')}
        action={{ href: '/tasks', label: t('Keep training') }}
      />
    )
  }

  return (
    <>
      {next ? (
        <section className="surface-ember relative overflow-hidden rounded-[20px] p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-lg">
              <Badge className="bg-coral/15 text-[#ffb3b3]">
                <Flag className="size-3" />
                {t('Next up')}
              </Badge>
              <h2 className="mt-4 text-balance text-[28px] font-normal text-white">{next.name}</h2>
              <p className="mt-1 text-ash">
                {[next.subject, formatRange(next.startsOn, next.endsOn, t, locale), next.level]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div className="shrink-0 md:text-right">
              <p className="text-sm text-ash">{t('Readiness')}</p>
              {next.readiness === null ? (
                <p className="mt-1 max-w-48 text-sm text-ash">
                  {t('No attempts in this subject yet.')}
                </p>
              ) : (
                <>
                  <p className="text-4xl font-medium tabular-nums text-white">{next.readiness}%</p>
                  <Progress
                    value={next.readiness}
                    className="mt-3 h-2 w-full md:w-48"
                  />
                </>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Search across everything a write-up holds; each row opens the olympiad's own page. */}
      <OlympiadBrowser competitions={competitions} />
    </>
  )
}
