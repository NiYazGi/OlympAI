'use client'

import type { ProfileField } from '@/lib/profile-options'

export type Answers = Partial<Record<ProfileField, string>>

const STORAGE_KEY = 'olympai:onboarding'
const CHANGE_EVENT = 'olympai:onboarding-change'

/**
 * sessionStorage is the source of truth for the in-progress answers, read
 * through useSyncExternalStore rather than mirrored into React state.
 *
 * Mirroring would mean restoring on mount with a setState inside an effect —
 * the cascading-render pattern React now warns about — and would leave two
 * copies of the same data to keep in step. Subscribing instead means a reload
 * simply reads what is already there.
 */
export function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  // Also covers the same flow open in another tab.
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** Returns the raw string so the snapshot is referentially stable between reads. */
export function readSnapshot(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    // Private browsing or storage disabled: the flow works, it just will not
    // survive a reload.
    return null
  }
}

export function serverSnapshot(): string | null {
  return null
}

export function parseAnswers(raw: string | null): Answers {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Answers) : {}
  } catch {
    return {}
  }
}

export function writeAnswers(answers: Answers) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
  } catch {
    /* see readSnapshot */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function clearAnswers() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nothing to clean up */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}
