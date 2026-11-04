'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { StartPaper } from '@/components/mock/start-paper'
import { useT } from '@/components/i18n-provider'
import { cn, fieldClass } from '@/lib/utils'
import type { RealPaper } from '@/lib/mock'

const PAGE = 20
const ALL = ''

/**
 * Every sitting in the archive, findable.
 *
 * The page used to print the first thirty papers by id, which meant the
 * Silk Road and the physics rounds were all a student could ever reach: the
 * other 358, every APMO and Balkan paper among them, simply never appeared.
 * Now the whole archive is here, narrowed by olympiad, year and a search.
 */
export function PaperBrowser({ papers }: { papers: RealPaper[] }) {
  const t = useT()
  const [olympiad, setOlympiad] = useState(ALL)
  const [year, setYear] = useState(ALL)
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)

  const olympiads = useMemo(() => {
    const counts = new Map<string, number>()
    for (const paper of papers) counts.set(paper.olympiad, (counts.get(paper.olympiad) ?? 0) + 1)
    return [...counts].sort((a, b) => b[1] - a[1])
  }, [papers])

  const years = useMemo(
    () =>
      [...new Set(papers.filter((paper) => !olympiad || paper.olympiad === olympiad).map((paper) => paper.year))]
        .filter((value): value is number => value !== null)
        .sort((a, b) => b - a),
    [papers, olympiad],
  )

  const needle = query.trim().toLowerCase()
  const filtered = papers.filter(
    (paper) =>
      (!olympiad || paper.olympiad === olympiad) &&
      (!year || String(paper.year) === year) &&
      (!needle || paper.title.toLowerCase().includes(needle)),
  )

  function reset(apply: () => void) {
    apply()
    setShown(PAGE)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {[[ALL, papers.length] as const, ...olympiads].map(([name, count]) => (
          <button
            key={name || 'all'}
            type="button"
            onClick={() => reset(() => {
              setOlympiad(name)
              setYear(ALL)
            })}
            aria-pressed={olympiad === name}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs transition-colors',
              olympiad === name
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {name ? name : t('All olympiads')} <span className="tabular-nums opacity-70">{count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">{t('Search papers')}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => reset(() => setQuery(event.target.value))}
            placeholder={t('Search: olympiad, year, grade')}
            className={cn(fieldClass, 'h-10 pl-9')}
          />
        </label>
        <label className="sm:w-40">
          <span className="sr-only">{t('Year')}</span>
          <select
            value={year}
            onChange={(event) => reset(() => setYear(event.target.value))}
            className={cn(fieldClass, 'h-10')}
          >
            <option value={ALL}>{t('Any year')}</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('{n} {n|paper|papers} found', { n: filtered.length })}
      </p>

      {filtered.length ? (
        <ul className="grid gap-2">
          {filtered.slice(0, shown).map((paper) => (
            <StartPaper key={paper.paper} paper={paper} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('No papers match. Try another year or olympiad.')}</p>
      )}

      {filtered.length > shown ? (
        <button
          type="button"
          onClick={() => setShown((count) => count + PAGE)}
          className="w-full rounded-lg bg-muted/50 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {t('Show {n} more', { n: Math.min(PAGE, filtered.length - shown) })}
        </button>
      ) : null}
    </div>
  )
}
