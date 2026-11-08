'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Atom, Bookmark, CornerDownLeft, Globe2, Layers, Search, Sigma, Trophy, X } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import { Badge } from '@/components/ui/badge'
import { Meter } from '@/components/meter'
import type { Competition } from '@/lib/types'
import { cardClass, cn } from '@/lib/utils'

const PAGE = 8

/** Short names students actually type; only those that match something are offered. */
const POPULAR = ['IMO', 'IPhO', 'IZhO', 'APMO', 'EGMO', 'APhO', 'Шёлковый путь', 'Республиканская']

function haystack(competition: Competition) {
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
    .join(' \n ')
    .toLowerCase()
}

/** Every word of the query must appear somewhere; a match in the name ranks first. */
function score(competition: Competition, words: string[], text: string) {
  if (!words.every((word) => text.includes(word))) return -1
  const name = competition.name.toLowerCase()
  return words.reduce((sum, word) => sum + (name.startsWith(word) ? 4 : name.includes(word) ? 2 : 0), 0)
}

function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>
  const lower = text.toLowerCase()
  const marks: [number, number][] = []
  for (const word of words) {
    let at = lower.indexOf(word)
    while (at !== -1) {
      marks.push([at, at + word.length])
      at = lower.indexOf(word, at + word.length)
    }
  }
  if (!marks.length) return <>{text}</>
  marks.sort((a, b) => a[0] - b[0])
  const parts: ReactNode[] = []
  let cursor = 0
  for (const [start, end] of marks) {
    if (start < cursor) continue
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(
      <mark key={start} className="rounded-sm bg-primary/15 px-0.5 text-foreground">
        {text.slice(start, end)}
      </mark>,
    )
    cursor = end
  }
  parts.push(text.slice(cursor))
  return <>{parts}</>
}

/**
 * Finding an olympiad, instead of scrolling past all of them.
 *
 * Nothing is listed until the student types or picks a section: the page opens
 * on a search box, sections with their counts and the usual names. Filtering
 * runs in the browser on the list the server already sent.
 */
export function OlympiadBrowser({ competitions }: { competitions: Competition[] }) {
  const t = useT()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [tracked, setTracked] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const deferred = useDeferredValue(query)

  // "/" jumps to the search box, as on most search pages.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.key !== '/' || target?.closest('input, textarea, select, [contenteditable]')) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const indexed = useMemo(() => competitions.map((c) => ({ c, text: haystack(c) })), [competitions])
  const subjects = useMemo(
    () => [...new Set(competitions.map((c) => c.subject).filter(Boolean))].sort() as string[],
    [competitions],
  )
  const levels = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of competitions) if (c.level) counts.set(c.level, (counts.get(c.level) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [competitions])
  const trackedCount = competitions.filter((c) => c.registered).length

  const words = useMemo(() => deferred.trim().toLowerCase().split(/\s+/).filter(Boolean), [deferred])
  const popular = useMemo(
    () => POPULAR.filter((name) => indexed.some(({ text }) => text.includes(name.toLowerCase()))),
    [indexed],
  )

  const results = useMemo(() => {
    return indexed
      .filter(({ c }) => (!subject || c.subject === subject) && (!level || c.level === level) && (!tracked || c.registered))
      .map(({ c, text }) => ({ c, rank: words.length ? score(c, words, text) : 0 }))
      .filter((row) => row.rank >= 0)
      .sort((a, b) => b.rank - a.rank)
      .map((row) => row.c)
  }, [indexed, words, subject, level, tracked])

  const active = Boolean(words.length || subject || level || tracked)
  const reset = () => {
    setQuery('')
    setSubject('')
    setLevel('')
    setTracked(false)
    setLimit(PAGE)
    inputRef.current?.focus()
  }
  const pick = (update: () => void) => {
    update()
    setLimit(PAGE)
  }

  return (
    <div className="space-y-4">
      <section className={cn(cardClass, 'space-y-4 p-5 sm:p-6')}>
        <div>
          <h2 className="text-[17px] font-medium text-foreground">{t('Find your olympiad')}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('{n} olympiads: what they are, who can take part and how selection works.', { n: competitions.length })}
          </p>
        </div>

        <label className="flex h-12 items-center gap-3 rounded-xl bg-foreground/[0.04] px-4 shadow-key transition-shadow focus-within:ring-2 focus-within:ring-primary/40">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => pick(() => setQuery(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && words.length && results[0]) {
                router.push(`/olympiads/${results[0].slug ?? results[0].id}`)
              }
              if (event.key === 'Escape') reset()
            }}
            placeholder={t('IMO, physics, Kazakhstan, team…')}
            aria-label={t('Search olympiads')}
            className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button type="button" onClick={() => pick(() => setQuery(''))} aria-label={t('Clear')} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="hidden rounded-md border border-foreground/10 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground pointer-fine:inline">/</kbd>
          )}
        </label>

        <div className="flex flex-wrap gap-2">
          <Chip active={!subject} onClick={() => pick(() => setSubject(''))}>
            {t('All subjects')}
          </Chip>
          {subjects.map((value) => (
            <Chip key={value} active={subject === value} onClick={() => pick(() => setSubject(subject === value ? '' : value))}>
              {/math/i.test(value) ? <Sigma className="size-3.5" /> : <Atom className="size-3.5" />}
              {t(value)}
            </Chip>
          ))}
          <span className="mx-1 hidden w-px self-stretch bg-foreground/10 sm:block" />
          {levels.map(([value, count]) => (
            <Chip key={value} active={level === value} onClick={() => pick(() => setLevel(level === value ? '' : value))}>
              {t(value)} <span className="font-mono text-[11px] opacity-60">{count}</span>
            </Chip>
          ))}
          {trackedCount ? (
            <Chip active={tracked} onClick={() => pick(() => setTracked(!tracked))}>
              <Bookmark className="size-3.5" /> {t('Tracking')} <span className="font-mono text-[11px] opacity-60">{trackedCount}</span>
            </Chip>
          ) : null}
        </div>

        {popular.length && !words.length ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <span className="text-muted-foreground">{t('Often searched:')}</span>
            {popular.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => pick(() => setQuery(name))}
                className="text-foreground underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {!active ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {levels.map(([value, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => pick(() => setLevel(value))}
              className={cn(cardClass, 'group flex items-center gap-4 p-5 text-left transition-colors hover:bg-foreground/[0.04]')}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                {/international|междунар/i.test(value) ? <Globe2 className="size-5" /> : <Layers className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{t(value)}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t('{n} {n|olympiad|olympiads}', { n: count })}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="eyebrow">{t('{shown} of {total}', { shown: results.length, total: competitions.length })}</p>
            <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <X className="size-3.5" />
              {t('Clear')}
            </button>
            {words.length && results.length ? (
              <span className="ml-auto hidden items-center gap-1 text-xs text-muted-foreground pointer-fine:flex">
                <CornerDownLeft className="size-3.5" /> {t('opens the first one')}
              </span>
            ) : null}
          </div>

          {results.length === 0 ? (
            <div className={cn(cardClass, 'p-6 text-sm text-muted-foreground')}>
              {t('Nothing matches that. Try a shorter search, or clear the filters.')}
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {results.slice(0, limit).map((competition) => (
                <li key={competition.id}>
                  <Link
                    href={`/olympiads/${competition.slug ?? competition.id}`}
                    prefetch={false}
                    className={cn(cardClass, 'group block h-full p-5 transition-colors hover:bg-foreground/[0.04]')}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                        <Trophy className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm leading-snug font-semibold">
                            <Highlight text={competition.name} words={words} />
                          </span>
                          {competition.registered ? (
                            <Badge variant="secondary" className="shrink-0 text-[10px]">
                              {t('Tracking')}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-caption text-muted-foreground">
                          {[
                            competition.subject ? t(competition.subject) : t('Several subjects'),
                            competition.level ? t(competition.level) : null,
                            competition.region ? t(competition.region) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </div>
                    {competition.summary ? (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{competition.summary}</p>
                    ) : null}
                    <div className="mt-4 flex items-center gap-3">
                      {competition.readiness === null ? (
                        <span className="flex-1 text-xs text-muted-foreground">{t('No attempts in this subject yet.')}</span>
                      ) : (
                        <>
                          <Meter value={competition.readiness} className="h-1 flex-1" />
                          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{competition.readiness}%</span>
                        </>
                      )}
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {results.length > limit ? (
            <button
              type="button"
              onClick={() => setLimit((n) => n + PAGE)}
              className={cn(cardClass, 'w-full p-3 text-sm text-foreground transition-colors hover:bg-foreground/[0.04]')}
            >
              {t('Show {n} more', { n: Math.min(PAGE, results.length - limit) })}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.04] text-foreground hover:bg-foreground/[0.08]',
      )}
    >
      {children}
    </button>
  )
}
