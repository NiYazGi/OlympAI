import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { BookOpen, ExternalLink, Globe } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { RegistrationButton } from '@/components/competitions/registration-button'
import { Meter } from '@/components/meter'
import { getCompetition } from '@/lib/supabase/competitions'
import { getLocale, getT } from '@/lib/i18n/server'
import { formatDate } from '@/lib/i18n/config'
import { cardClass, cn } from '@/lib/utils'

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
  const [competition, t, locale] = await Promise.all([getCompetition(slug), getT(), getLocale()])
  if (!competition) notFound()

  const level = competition.level
    ? t(competition.level)
    : null
  const region = competition.region
    ? t(competition.region)
    : null
  const links = [
    competition.officialUrl
      ? { href: competition.officialUrl, label: t('Official site'), icon: Globe }
      : null,
    competition.papersUrl
      ? { href: competition.papersUrl, label: t('Past papers'), icon: BookOpen }
      : null,
    competition.registrationUrl && competition.registrationUrl !== competition.officialUrl
      ? { href: competition.registrationUrl, label: t('Enter on the official site'), icon: ExternalLink }
      : null,
  ].filter(Boolean) as { href: string; label: string; icon: typeof Globe }[]

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <BackLink href="/olympiads">{t('All olympiads')}</BackLink>

      <PageHeader
        title={competition.name}
        description={[
          competition.subject
            ? t(competition.subject)
            : t('Several subjects'),
          level,
        ]
          .filter(Boolean)
          .join(' · ')}
      />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label={t('Region')} value={region} />
        <Fact label={t('Founded')} value={competition.founded?.toString() ?? null} />
        <Fact label={t('Level')} value={level} />
        <div className={cn(cardClass, 'p-4')}>
          <dt className={'eyebrow'}>{t('Readiness')}</dt>
          {competition.readiness === null ? (
            <dd className="mt-2 text-xs text-muted-foreground">{t('No attempts in this subject yet.')}</dd>
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

      {competition.detailsLocale && competition.detailsLocale !== locale ? (
        <p className="text-xs text-muted-foreground">{t('This write-up is available in Russian.')}</p>
      ) : null}

      {competition.summary ? (
        <Section title={t('What it is')}>{competition.summary}</Section>
      ) : (
        <p className="text-sm text-muted-foreground">{t('No write-up for this one yet — the official site is the authority.')}</p>
      )}
      {competition.format ? (
        <Section title={t('The papers')}>{competition.format}</Section>
      ) : null}
      {competition.eligibility ? (
        <Section title={t('Who can enter')}>{competition.eligibility}</Section>
      ) : null}
      {competition.route ? <Section title={t('How you get there')}>{competition.route}</Section> : null}

      {competition.sources.length > 0 ? (
        <section className="space-y-3">
          <h2 className="eyebrow">{t('Sources and rules')}</h2>
          {competition.reviewedOn ? (
            <p className="text-xs leading-5 text-muted-foreground">
              {t('Sources checked: {date} · Confirm this season’s eligibility and selection with the organiser.', {
                date: formatDate(new Date(`${competition.reviewedOn}T00:00:00Z`), locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
              })}
            </p>
          ) : null}
          <ul className="space-y-2">
            {competition.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(cardClass, 'flex items-start gap-3 p-3 text-sm leading-5 transition-colors hover:bg-muted/40')}
                >
                  <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">{source.title}</span>
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {links.length > 0 ? (
        <section className="space-y-3">
          <h2 className={'eyebrow'}>{t('Links')}</h2>
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
        <p className="text-xs leading-5 text-muted-foreground">{t('Tracking keeps it on your list here. Entering is done on the organiser’s site.')}</p>
      </div>

      <p className="text-sm leading-6 text-pretty text-muted-foreground">{t('No dates here on purpose: the sitting moves every year, and the organiser’s own page is the only place that is right. Your own target date is set on Learn.')}</p>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className={cn(cardClass, 'p-4')}>
      <dt className={'eyebrow'}>{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-pretty">{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className={'eyebrow'}>{title}</h2>
      <p className="text-sm leading-6 text-pretty">{children}</p>
    </section>
  )
}
