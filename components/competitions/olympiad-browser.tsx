'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, Trophy, X } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Meter } from '@/components/meter'
import type { Competition } from '@/lib/types'
import { cardClass, cn } from '@/lib/utils'

/**
 * The catalogue, searchable.
 *
 * Fifty-two rows is past the point where scrolling is a way of finding
 * something. Everything is filtered in the browser against the list the server
 * already sent: the whole catalogue is a few kilobytes, and a round trip per
 * keystroke to filter it would be slower and worse.
 *
 * The search reads the write-up too, not just the name. "Team" finds the ones
 * that are entered in teams; "лаборатор" finds EUSO. A student who does not
 * know what an olympiad is called can still find it by what it is.
 */
export function OlympiadBrowser({ competitions }: { competitions: Competition[] }) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  // The list is re-filtered on a lower priority than the keystroke, so typing
  // never waits on it.
  const deferred = useDeferredValue(query)

  const subjects = useMemo(
    () => [...new Set(competitions.map((c) => c.subject).filter(Boolean))].sort() as string[],
    [competitions],
  )
  const levels = useMemo(
    () => [...new Set(competitions.map((c) => c.level).filter(Boolean))].sort() as string[],
    [competitions],
  )

  const shown = useMemo(() => {
    const needle = deferred.trim().toLowerCase()
    return competitions.filter((competition) => {
      if (subject && competition.subject !== subject) return false
      if (level && competition.level !== level) return false
      if (!needle) return true
      return [
        competition.name,
        competition.subject,
        competition.level,
        competition.region,
        competition.summary,
        competition.format,
        competition.eligibility,
        competition.route,
      ]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(needle))
    })
  }, [competitions, deferred, subject, level])

  const filtered = Boolean(query || subject || level)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('Search by name, subject or region')}
            aria-label={t('Search by name, subject or region')}
            className="h-10 pl-9"
          />
        </div>
        <Select
          value={subject}
          onChange={setSubject}
          label={t('Subject')}
          all={t('All subjects')}
          options={subjects.map((value) => ({ value, label: t(value) }))}
        />
        <Select
          value={level}
          onChange={setLevel}
          label={t('Level')}
          all={t('All levels')}
          options={levels.map((value) => ({ value, label: t(value) }))}
        />
      </div>

      <div className="flex items-center gap-3">
        <p className={'eyebrow'}>{t('{shown} of {total}', { shown: shown.length, total: competitions.length })}</p>
        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setSubject('')
              setLevel('')
            }}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <X className="size-3.5" />
            {t('Clear')}
          </button>
        ) : null}
      </div>

      {shown.length === 0 ? (
        <p className={cn(cardClass, 'p-6 text-sm text-muted-foreground')}>
          {t('Nothing matches that. Try a shorter search, or clear the filters.')}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((competition) => (
            <li key={competition.id}>
              <Link
                href={`/olympiads/${competition.slug ?? competition.id}`}
                prefetch={false}
                className={cn(cardClass, 'transition-colors hover:bg-foreground/[0.04]', 'group block h-full p-5')}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Trophy className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm leading-snug font-semibold">{competition.name}</span>
                      {competition.registered ? (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {t('Tracking')}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-caption text-muted-foreground">
                      {[
                        competition.subject
                          ? t(competition.subject)
                          : t('Several subjects'),
                        competition.level ? t(competition.level) : null,
                        competition.region
                          ? t(competition.region)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </div>

                {competition.summary ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {competition.summary}
                  </p>
                ) : null}

                <div className="mt-4 flex items-center gap-3">
                  {competition.readiness === null ? (
                    <span className="flex-1 text-xs text-muted-foreground">
                      {t('No attempts in this subject yet.')}
                    </span>
                  ) : (
                    <>
                      <Meter value={competition.readiness} className="h-1 flex-1" />
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {competition.readiness}%
                      </span>
                    </>
                  )}
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Select({
  value,
  onChange,
  label,
  all,
  options,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  all: string
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className="h-10 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-44 dark:bg-input/30"
    >
      <option value="">{all}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
