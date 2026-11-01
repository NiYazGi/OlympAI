'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Flame as FlameIcon } from 'lucide-react'
import { recordVisit } from '@/app/(app)/flame/actions'
import { useT } from '@/components/i18n-provider'
import { localDay, MILESTONES, type Flame } from '@/lib/flame'
import { cn } from '@/lib/utils'

/**
 * One request per page load and day, shared. An effect can run twice for one
 * mount (React does it on purpose in development): two calls would let the
 * first record the visit and the second find it already there, and whichever
 * answer arrived second would decide whether the student is told about it.
 */
let pending: { day: string; result: ReturnType<typeof recordVisit> } | null = null
function recordOnce(day: string) {
  if (pending?.day !== day) pending = { day, result: recordVisit(day) }
  return pending.result
}

/**
 * The flame in the header: days in a row the app has been opened.
 *
 * Opening the app is what keeps it alive, so this component is also what
 * records the visit — once per page load, with the browser's own calendar
 * day. The first visit of a day lights the flame, swells it once and says how
 * long the run is now; every later visit that day changes nothing.
 *
 * Orange when today is counted, grey until it is. Clicking opens the week
 * and the record, and the one rule there is.
 */
export function FlameButton({ initial }: { initial: Flame }) {
  const t = useT()
  const [flame, setFlame] = useState(initial)
  const [open, setOpen] = useState(false)
  const [news, setNews] = useState<string | null>(null)
  const [pop, setPop] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  // Record today. The flame read on the server could only guess the student's
  // date; the answer to this call is exact, so it replaces it.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    void recordOnce(localDay()).then((result) => {
      if (cancelled || !result.ok || !result.flame) return
      setFlame(result.flame)
      if (result.extended) {
        const n = result.flame.current
        setNews(MILESTONES.includes(n) ? t.flame.milestone(n) : t.flame.extended(n))
        setPop(true)
        timer = setTimeout(() => setNews(null), 4000)
      }
    })
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // Once per mount: the layout holding this stays mounted across pages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close on a click elsewhere or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label = flame.lit ? t.flame.label(flame.current) : t.flame.unlit

  return (
    <div ref={rootRef} className="relative" data-tour="flame">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-sm font-semibold tabular-nums transition-colors hover:bg-foreground/10',
          flame.lit ? 'text-warning' : 'text-muted-foreground',
        )}
      >
        <FlameIcon
          className={cn('size-4.5', flame.lit && 'fill-chrome', pop && 'flame-pop')}
          onAnimationEnd={() => setPop(false)}
        />
        {flame.current}
      </button>

      {/* The day's news, under the flame for a few seconds. A live region,
          so a screen reader hears it too. */}
      <div aria-live="polite" className="pointer-events-none absolute top-full right-0 z-40 mt-2">
        {news && !open ? (
          <p className="sheet-up rounded-sm border border-chrome bg-background px-3 py-2 text-sm font-semibold whitespace-nowrap text-warning shadow-lg">
            {news}
          </p>
        ) : null}
      </div>

      {open ? (
        <div
          id={panelId}
          className="sheet-up absolute top-full right-0 z-40 mt-2 w-72 rounded-2xl border border-border bg-background p-4 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-2xl',
                flame.lit ? 'bg-chrome/25 text-warning' : 'bg-muted text-muted-foreground',
              )}
            >
              <FlameIcon className={cn('size-7', flame.lit && 'fill-chrome')} />
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold tracking-tight">{t.flame.title(flame.current)}</p>
              <p className="text-xs text-muted-foreground">
                {flame.lit ? t.flame.litToday : t.flame.unlit}
              </p>
            </div>
          </div>

          {flame.week.length ? (
            <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label={t.flame.title(flame.current)}>
              {flame.week.map((entry) => (
                <li key={entry.day} className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full',
                      entry.visited ? 'bg-chrome text-ink' : 'bg-muted text-muted-foreground',
                    )}
                    aria-label={`${entry.day}${entry.visited ? ' ✓' : ''}`}
                  >
                    <FlameIcon className={cn('size-3.5', entry.visited && 'fill-white')} />
                  </span>
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {t.flame.weekday(entry.day)}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}

          <p className="mt-4 text-xs leading-5 text-muted-foreground">{t.flame.rule}</p>
          {flame.best > 0 ? (
            <p className="mt-2 text-caption text-muted-foreground">{t.flame.best(flame.best)}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
