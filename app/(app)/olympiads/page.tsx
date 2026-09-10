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
import { cardClass } from '@/lib/utils'

export const metadata = { title: 'Olympiads' }
export const dynamic = 'force-dynamic'

function formatRange(startsOn: string | null, endsOn: string | null) {
  // Catalogue entries carry no date: the sitting moves every year and belongs
  // to the official site, not to this table.
  // "Date set by the organiser" read as "they will tell you later". They will
  // not tell you here — the date is on their site, and this table has never
  // claimed to know it.
  if (!startsOn) return 'Dates on the official page'
  const start = new Date(`${startsOn}T00:00:00Z`)
  const options = { month: 'short', day: 'numeric', timeZone: 'UTC' } as const
  if (!endsOn || endsOn === startsOn) return start.toLocaleDateString('en', options)
  const end = new Date(`${endsOn}T00:00:00Z`)
  return `${start.toLocaleDateString('en', options)} – ${end.toLocaleDateString('en', options)}`
}

export default function OlympiadsPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader
        title="Olympiads"
        description="Upcoming competitions and your preparation for each."
      />
      <Reveal
        fallback={
          <>
            <PendingRegion label="Loading competitions" />
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
  const competitions = await getCompetitions()
  const next = competitions[0]

  if (competitions.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No competitions listed yet"
        body="This page shows real competitions and how ready you are for each, based on your accuracy in that subject. Nothing has been added yet."
        action={{ href: '/tasks', label: 'Keep training' }}
      />
    )
  }

  return (
    <>
      {next ? (
        <section className="overflow-hidden rounded-xl bg-primary p-6 text-primary-foreground md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-lg">
              <Badge className="bg-primary-foreground/15 text-primary-foreground">
                <Flag className="size-3" />
                Next up
              </Badge>
              <h2 className="mt-3 text-balance text-2xl font-semibold">{next.name}</h2>
              <p className="mt-1 text-primary-foreground/70">
                {[next.subject, formatRange(next.startsOn, next.endsOn), next.level]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div className="shrink-0 md:text-right">
              <p className="text-sm text-primary-foreground/70">Readiness</p>
              {next.readiness === null ? (
                <p className="mt-1 max-w-48 text-sm text-primary-foreground/70">
                  No attempts in this subject yet.
                </p>
              ) : (
                <>
                  <p className="text-4xl font-semibold tabular-nums">{next.readiness}%</p>
                  <Progress
                    value={next.readiness}
                    className="mt-3 h-2 w-full bg-primary-foreground/20 md:w-48"
                  />
                </>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {competitions.map((competition) => (
          <article key={competition.id} className={`${cardClass} flex flex-col gap-4 p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                  <Trophy className="size-5 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold leading-tight">{competition.name}</h3>
                  {competition.subject ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{competition.subject}</p>
                  ) : null}
                </div>
              </div>
              {competition.registered ? (
                <Badge variant="secondary" className="shrink-0">
                  Tracking
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                {formatRange(competition.startsOn, competition.endsOn)}
              </span>
              {competition.level ? (
                <Badge variant="outline" className="text-xs">
                  {competition.level}
                </Badge>
              ) : null}
              {competition.registrationUrl ? (
                <a
                  href={competition.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Enter on the official site <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Accuracy in {competition.subject ?? 'this subject'}
                </span>
                <span className="font-medium tabular-nums">
                  {competition.readiness === null ? 'No data' : `${competition.readiness}%`}
                </span>
              </div>
              {competition.readiness !== null ? (
                <Progress value={competition.readiness} className="mt-2 h-1.5" />
              ) : null}
            </div>

            <div className="space-y-2">
              <RegistrationButton
                competitionId={competition.id}
                registered={competition.registered}
              />
              <p className="text-xs text-muted-foreground">
                Tracking keeps it on your list here. Entering is done on the organiser&apos;s site.
              </p>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
