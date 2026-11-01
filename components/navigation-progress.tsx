'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * A thin bar along the top of the window while a navigation waits on the
 * server.
 *
 * Most navigations never show it: a prefetched page, or one whose loading
 * skeleton was prefetched, commits at once, and the bar stays invisible for
 * its first 120ms. It is for the other case — a slow connection, a page not
 * yet prefetched — where a click that produced nothing on screen reads as a
 * click that did not register, and gets clicked again.
 *
 * The state lives outside React because it is started by a document-level
 * click listener and finished by the router, and neither of those is a render.
 */

type Phase = 'idle' | 'loading' | 'done'
type Snapshot = { phase: Phase; from: string; key: number }

const IDLE: Snapshot = { phase: 'idle', from: '', key: 0 }
/** Past this the navigation has failed or been abandoned; stop pretending. */
const GIVE_UP_MS = 12_000
/** Long enough for the completion to play before the bar is removed. */
const FINISH_MS = 450

let snapshot: Snapshot = IDLE
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | null = null

function emit(next: Snapshot) {
  snapshot = next
  listeners.forEach((listener) => listener())
}

function schedule(ms: number, run: () => void) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(run, ms)
}

function start(from: string) {
  const key = snapshot.key + 1
  emit({ phase: 'loading', from, key })
  schedule(GIVE_UP_MS, () => finish(key))
}

function finish(key = snapshot.key) {
  if (snapshot.phase !== 'loading' || snapshot.key !== key) return
  emit({ ...snapshot, phase: 'done' })
  schedule(FINISH_MS, () => {
    if (snapshot.key === key) emit({ ...snapshot, phase: 'idle' })
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const read = () => snapshot
const readOnServer = () => IDLE

function currentRoute() {
  return `${window.location.pathname}${window.location.search}`
}

/** Would the router handle this click as a navigation to somewhere else? */
function navigationTarget(event: MouseEvent): URL | null {
  // A modified click opens a new tab or window; this page is not waiting.
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null
  }
  const anchor = (event.target as Element | null)?.closest?.('a[href]')
  if (!(anchor instanceof HTMLAnchorElement)) return null
  if (anchor.target && anchor.target !== '_self') return null
  if (anchor.hasAttribute('download')) return null

  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin) return null
  // Same page, or only the hash differs: nothing to wait for.
  if (`${url.pathname}${url.search}` === currentRoute()) return null
  return url
}

export function NavigationProgress() {
  const pathname = usePathname()
  const query = useSearchParams().toString()
  const route = query ? `${pathname}?${query}` : pathname
  const { phase, key } = useSyncExternalStore(subscribe, read, readOnServer)

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (navigationTarget(event)) start(currentRoute())
    }
    // Capture phase, so the bar starts even when a Link's own handler stops
    // the event from bubbling any further.
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // The router has committed the new URL: the wait is over, whatever is still
  // streaming in behind its own skeleton.
  useEffect(() => {
    if (snapshot.phase === 'loading' && route !== snapshot.from) finish()
  }, [route])

  if (phase === 'idle') return null

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5">
      <div key={key} className="nav-progress-bar" data-state={phase} />
    </div>
  )
}
