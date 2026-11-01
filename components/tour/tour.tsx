'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle, X } from 'lucide-react'
import { finishTour } from '@/app/(app)/tour/actions'
import { useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { tourFor, tourHome, type TourRole, type TourStep } from '@/lib/tour'
import { cn } from '@/lib/utils'

/** How long a step waits for its target to stream in before giving up on it. */
const WAIT_MS = 2500
/** Space between the target and the ring drawn round it. */
const PAD = 6
const GAP = 12

type Rect = { top: number; left: number; width: number; height: number }

const noop = () => () => {}

/**
 * The window's size, kept current whether or not the tour is open: a phone
 * turned on its side between two tours must not leave the card placed for the
 * old width, off the edge of the new one. As a string, so the snapshot is a
 * value React can compare.
 */
function useViewport() {
  const size = useSyncExternalStore(
    (onChange) => {
      window.addEventListener('resize', onChange)
      return () => window.removeEventListener('resize', onChange)
    },
    () => `${window.innerWidth}x${window.innerHeight}`,
    () => '0x0',
  )
  const [width, height] = size.split('x').map(Number)
  return { width: width ?? 0, height: height ?? 0 }
}
/**
 * False on the server and while hydrating, true after. The card is a portal
 * into <body>, which the server cannot render; drawing it during hydration
 * made the client's first render differ from the server's, and React threw
 * the boundary away and tried again, round and round, with no tour at the end.
 */
const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )

/** The first of the step's targets that is actually on screen. */
function findTarget(step: TourStep): { element: HTMLElement; target: string } | null {
  for (const target of step.targets) {
    for (const element of document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)) {
      const rect = element.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0 && element.offsetParent !== null) return { element, target }
    }
  }
  return null
}

/**
 * The "?" in the header. A link rather than a button, so it works from any
 * page: it goes to the page the tour runs on and asks for the tour there.
 */
export function TourButton({ role }: { role: TourRole }) {
  const t = useT()
  return (
    <Link
      href={`${tourHome(role)}?tour=1`}
      prefetch={false}
      aria-label={t.tour.open}
      title={t.tour.open}
      className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground pointer-coarse:size-11 transition-colors hover:bg-foreground/10 hover:text-foreground"
    >
      <HelpCircle className="size-4.5" />
    </Link>
  )
}

/**
 * A guided tour of the app: one thing at a time, the rest of the page dimmed.
 *
 * Starts by itself once, the first time an account reaches its home page, and
 * again whenever the "?" asks for it. Every step can be skipped, Escape closes
 * it, the arrow keys move through it, and focus stays inside the card while it
 * is open — it is a dialog, and is announced as one.
 *
 * The page underneath is not clickable while the tour is open. A tour that lets
 * a click on the highlighted link carry you off half-way through leaves you on
 * a new page with a card describing the old one.
 */
export function Tour({ role, autoStart }: { role: TourRole; autoStart: boolean }) {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const steps = tourFor(role)
  const home = tourHome(role)
  const asked = params.get('tour') === '1'

  const [index, setIndex] = useState<number | null>(null)
  // Where the current step's target is, tagged with the step it belongs to so
  // a new step never draws the ring round the last one's target.
  const [found, setFound] = useState<{ key: string; rect: Rect; more: boolean } | null>(null)
  const [card, setCard] = useState<{ width: number; height: number }>({ width: 340, height: 220 })
  const viewport = useViewport()
  const cardRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const bodyId = useId()
  const hydrated = useHydrated()

  // Start on the home page, when the "?" asked or when this account has never
  // been shown round. Decided while rendering, from the address: the tour is
  // a function of where you are and what the link said, not something an
  // effect has to notice afterwards.
  const signal = `${pathname}|${asked ? 1 : 0}`
  const [seen, setSeen] = useState<string | null>(null)
  const [autoUsed, setAutoUsed] = useState(false)
  if (seen !== signal) {
    setSeen(signal)
    if (pathname === home && (asked || (autoStart && !autoUsed))) {
      setIndex(0)
      setAutoUsed(true)
    }
  }

  const close = useCallback(() => {
    setIndex(null)
    void finishTour()
    if (asked) router.replace(pathname, { scroll: false })
  }, [asked, pathname, router])

  const step = index === null ? null : steps[index]
  const located = step && found?.key === step.key ? found : null
  const rect = located?.rect ?? null
  const fellBack = located?.more ?? false

  // Find the step's target, waiting a moment for it if the page is still
  // streaming, then bring it into view and follow it as the page moves.
  useEffect(() => {
    if (!step || !step.targets.length) return

    let element: HTMLElement | null = null
    let more = false
    const since = Date.now()
    let frame = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const measure = () => {
      if (!element) return
      const box = element.getBoundingClientRect()
      setFound({
        key: step.key,
        rect: { top: box.top, left: box.left, width: box.width, height: box.height },
        more,
      })
    }
    const onMove = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    const look = () => {
      const hit = findTarget(step)
      if (hit) {
        element = hit.element
        more = hit.target === 'nav:more'
        // Instant, not smooth: the tour is waiting on this scroll, and an
        // animated one is half a second of the page sliding under the card.
        element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
        measure()
        window.addEventListener('scroll', onMove, true)
        window.addEventListener('resize', onMove)
        return
      }
      if (Date.now() - since < WAIT_MS) timer = setTimeout(look, 120)
    }
    timer = setTimeout(look, 0)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [step])

  // The card's own size, which placing it next to its target depends on.
  useEffect(() => {
    const element = cardRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const box = entry.target.getBoundingClientRect()
      setCard((current) =>
        current.width === box.width && current.height === box.height
          ? current
          : { width: box.width, height: box.height },
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [step, hydrated])

  // Focus moves to the card's main button on every step, and again once the
  // card has moved next to a target that arrived late.
  const hasRect = rect !== null
  useEffect(() => {
    if (step) primaryRef.current?.focus({ preventScroll: true })
  }, [step, hasRect, hydrated])

  const next = useCallback(() => {
    if (index === null) return
    if (index >= steps.length - 1) close()
    else setIndex(index + 1)
  }, [index, steps.length, close])
  const back = useCallback(() => {
    if (index !== null && index > 0) setIndex(index - 1)
  }, [index])

  useEffect(() => {
    if (index === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        next()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        back()
      } else if (event.key === 'Tab' && cardRef.current) {
        // Keep focus inside the card.
        const focusable = cardRef.current.querySelectorAll<HTMLElement>('button, [href]')
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (!first || !last) return
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, close, next, back])

  if (!step || index === null || !hydrated) return null

  const copy = t.tour.steps[step.key]
  const last = index === steps.length - 1
  const phone = viewport.width > 0 && viewport.width < 640
  const ring = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null

  // Where the card goes. On a phone it is a sheet above the bottom bar, out of
  // the way of whatever it points at. Elsewhere: right of a narrow thing on the
  // left edge (the rail), else below the target, else above it, else centred.
  let position: React.CSSProperties
  if (phone) {
    position = { left: 12, right: 12, bottom: 'calc(5rem + env(safe-area-inset-bottom))' }
    // A target low on the screen would sit under the sheet: put the sheet up top.
    if (ring && ring.top + ring.height > viewport.height - card.height - 100) {
      position = { left: 12, right: 12, top: 'calc(4rem + env(safe-area-inset-top))' }
    }
  } else if (ring) {
    const clampLeft = (left: number) => Math.max(12, Math.min(left, viewport.width - card.width - 12))
    const clampTop = (top: number) => Math.max(12, Math.min(top, viewport.height - card.height - 12))
    if (ring.left < 120 && ring.width < 120) {
      position = { left: ring.left + ring.width + GAP, top: clampTop(ring.top + ring.height / 2 - card.height / 2) }
    } else if (ring.top + ring.height + GAP + card.height < viewport.height - 12) {
      position = { left: clampLeft(ring.left), top: ring.top + ring.height + GAP }
    } else if (ring.top - GAP - card.height > 12) {
      position = { left: clampLeft(ring.left), top: ring.top - GAP - card.height }
    } else {
      position = { left: clampLeft(ring.left + ring.width - card.width), top: clampTop(ring.top + 16) }
    }
  } else {
    position = {
      left: Math.max(12, (viewport.width - card.width) / 2),
      top: Math.max(12, (viewport.height - card.height) / 2),
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      {/* The dim. With a target it is the shadow of the ring, so the target
          shows through untouched; without one it is a plain veil. */}
      {ring ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl transition-[top,left,width,height] duration-200 ease-out motion-reduce:transition-none"
          // One shadow list for both, because a ring is a box-shadow too and a
          // second one would replace it: the ring in the brand colour, a soft
          // glow so it reads on a dark page, and the dim over everything else.
          style={{
            ...ring,
            boxShadow:
              '0 0 0 2px var(--primary), 0 0 24px 4px color-mix(in oklab, var(--primary) 45%, transparent), 0 0 0 9999px rgba(0, 0, 0, 0.66)',
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-black/65" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={cn(
          'absolute rounded-2xl border border-border bg-background p-4 shadow-xl sm:p-5',
          'animate-in fade-in duration-150 motion-reduce:animate-none',
          !phone && 'w-[340px]',
        )}
        style={position}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-caption font-semibold text-muted-foreground">
            {t.tour.step(index + 1, steps.length)}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label={t.tour.close}
            className="-m-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <h2 id={titleId} className="mt-1.5 text-base font-bold tracking-tight">
          {copy.title}
        </h2>
        <p id={bodyId} className="mt-1.5 text-sm leading-6 text-pretty text-muted-foreground">
          {copy.body}
          {step.more && fellBack ? ` ${t.tour.inMore}` : ''}
        </p>

        {/* Progress, as dots: how long this is matters more than where in it. */}
        <div aria-hidden className="mt-4 flex gap-1">
          {steps.map((entry, n) => (
            <span
              key={entry.key}
              className={cn('h-1 flex-1 rounded-full', n <= index ? 'bg-primary' : 'bg-muted')}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          {last ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={close}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {t.tour.skip}
            </button>
          )}
          <div className="flex items-center gap-2">
            {index > 0 ? (
              <Button variant="ghost" onClick={back}>
                {t.tour.back}
              </Button>
            ) : null}
            <Button ref={primaryRef} onClick={next}>
              {last ? t.tour.done : t.tour.next}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
