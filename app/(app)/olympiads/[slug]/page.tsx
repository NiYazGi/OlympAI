import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { BookOpen, ExternalLink, Globe } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { RegistrationButton } from '@/components/competitions/registration-button'
import { Meter } from '@/components/meter'
import { getCompetition } from '@/lib/supabase/competitions'
import { getT } from '@/lib/i18n'
import { cardClass, cn, labelClass } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const competition = await getCompetition(slug)
  return { title: competition?.name ?? 'Olympiad' }
}

/**
 * One olympiad, at length.
 *
 * The list answers "which one"; this answers "is this mine". Four questions,
 * in the order a student asks them: what is it, what do the papers look like,
 * am I allowed in, and how do I get there. Then the links, because everything
 * that changes from year to year lives on the organiser's page and not here.
 *
 * A section with nothing written is absent rather than empty. A heading over a
 * blank is a promise the catalogue has not kept.
 */
export default async function OlympiadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [competition, t] = await Promise.all([getCompetition(slug), getT()])
  if (!competition) notFound()

  const level = competition.level
    ? (t.olympiads.levels[competition.level] ?? competition.level)
    : null
  const region = competition.region
    ? (t.olympiads.regions[competition.region] ?? competition.region)
    : null
  const links = [
    competition.officialUrl
      ? { href: competition.officialUrl, label: t.olympiads.officialSite, icon: Globe }
      : null,
    competition.papersUrl
      ? { href: competition.papersUrl, label: t.olympiads.pastPapers, icon: BookOpen }
      : null,
    competition.registrationUrl && competition.registrationUrl !== competition.officialUrl
      ? { href: competition.registrationUrl, label: t.olympiads.enterSite, icon: ExternalLink }
      : null,
  ].filter(Boolean) as { href: string; label: string; icon: typeof Globe }[]

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <BackLink href="/olympiads">{t.olympiads.back}</BackLink>

      <PageHeader
        title={competition.name}
        description={[
          competition.subject
            ? (t.subjects[competition.subject] ?? competition.subject)
            : t.olympiads.multiSubject,
          level,
        ]
          .filter(Boolean)
          .join(' · ')}
      />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label={t.olympiads.region} value={region} />
        <Fact label={t.olympiads.founded} value={competition.founded?.toString() ?? null} />
        <Fact label={t.olympiads.level} value={level} />
        <div className={cn(cardClass, 'p-4')}>
          <dt className={labelClass}>{t.olympiads.readiness}</dt>
          {competition.readiness === null ? (
            <dd className="mt-2 text-xs text-muted-foreground">{t.olympiads.noAttempts}</dd>
          ) : (
            <dd className="mt-2">
              <span className="font-display text-xl leading-none font-bold tabular-nums">
                {competition.readiness}%
              </span>
              <Meter value={competition.readiness} className="mt-2 h-1" />
            </dd>
          )}
        </div>
      </dl>

      {competition.summary ? (
        <Section title={t.olympiads.about}>{competition.summary}</Section>
      ) : (
        <p className="text-sm text-muted-foreground">{t.olympiads.noWriteUp}</p>
      )}
      {competition.format ? (
        <Section title={t.olympiads.format}>{competition.format}</Section>
      ) : null}
      {competition.eligibility ? (
        <Section title={t.olympiads.eligibility}>{competition.eligibility}</Section>
      ) : null}
      {competition.route ? <Section title={t.olympiads.route}>{competition.route}</Section> : null}

      {links.length > 0 ? (
        <section className="space-y-3">
          <h2 className={labelClass}>{t.olympiads.links}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    cardClass,
                    'flex items-center gap-2.5 p-3 text-sm transition-colors hover:bg-muted/40',
                  )}
                >
                  <link.icon className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate">{link.label}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="space-y-2">
        <RegistrationButton competitionId={competition.id} registered={competition.registered} />
        <p className="text-xs leading-5 text-muted-foreground">{t.olympiads.trackNote}</p>
      </div>

      <p className="text-sm leading-6 text-pretty text-muted-foreground">{t.olympiads.datesNote}</p>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className={cn(cardClass, 'p-4')}>
      <dt className={labelClass}>{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-pretty">{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className={labelClass}>{title}</h2>
      <p className="text-sm leading-6 text-pretty">{children}</p>
    </section>
  )
}
