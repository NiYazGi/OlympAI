'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * The theme, shared by the header toggle and the Appearance setting.
 *
 * Both used to carry their own copy of this logic. The class on <html> stays
 * the source of truth — the inline script in <head> sets it before first
 * paint — and this only reads and writes it.
 */

export type Theme = 'dark' | 'light'

const KEY = 'olympai:theme'
const EVENT = 'olympai:theme-change'

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** Reads the class the inline script already applied, so the two never disagree. */
function readTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

// Light on the server: it is the default, so this matches the markup.
const serverTheme = (): Theme => 'light'

function apply(next: Theme) {
  const root = document.documentElement
  root.classList.toggle('light', next === 'light')
  root.classList.toggle('dark', next === 'dark')
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // Private browsing: the choice holds for this page only.
  }
  window.dispatchEvent(new Event(EVENT))
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> }
}

/**
 * Switches the theme, spreading the new one out from `origin` — the control
 * that was pressed — as a growing circle.
 *
 * The change is the same either way; the circle only says where it came from.
 * Without the View Transitions API, or for anyone who has asked for reduced
 * motion, the colours simply swap.
 */
export function setTheme(next: Theme, origin?: { x: number; y: number }) {
  const doc = document as ViewTransitionDocument
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || reduced || readTheme() === next) {
    apply(next)
    return
  }

  const x = origin?.x ?? window.innerWidth / 2
  const y = origin?.y ?? 0
  // Far enough to cover the corner furthest from the origin.
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

  const root = document.documentElement
  root.classList.add('theme-transition')
  const transition = doc.startViewTransition(() => apply(next))
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 480,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    .catch(() => {
      // A skipped transition still applied the theme; there is nothing to animate.
    })
  transition.finished.finally(() => root.classList.remove('theme-transition'))
}

/** The centre of the element that was pressed, for `setTheme`'s origin. */
export function originOf(element: Element) {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme)
  const choose = useCallback((next: Theme, origin?: { x: number; y: number }) => {
    setTheme(next, origin)
  }, [])
  return [theme, choose] as const
}
