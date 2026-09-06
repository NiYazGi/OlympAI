'use client'

/**
 * Unsent work kept in sessionStorage and read through useSyncExternalStore.
 *
 * Restoring on mount with a setState inside an effect is the cascading-render
 * pattern React now warns about, and it leaves two copies of the same data to
 * keep in step. Subscribing instead means a reload simply reads what is there.
 *
 * Used by the onboarding answers and by mock-test drafts — losing an hour of
 * written derivation to a stray refresh is the worst failure either screen has.
 */
export type DraftStore<T> = {
  subscribe: (onChange: () => void) => () => void
  read: () => string | null
  serverRead: () => null
  parse: (raw: string | null) => T
  write: (value: T) => void
  clear: () => void
}

export function createDraftStore<T>(key: string, empty: () => T): DraftStore<T> {
  const event = `olympai:draft:${key}`

  return {
    subscribe(onChange) {
      window.addEventListener(event, onChange)
      // Also covers the same screen open in another tab.
      window.addEventListener('storage', onChange)
      return () => {
        window.removeEventListener(event, onChange)
        window.removeEventListener('storage', onChange)
      }
    },
    /** Returns the raw string so the snapshot stays referentially stable. */
    read() {
      try {
        return sessionStorage.getItem(key)
      } catch {
        // Private browsing or storage disabled: the screen works, it just will
        // not survive a reload.
        return null
      }
    },
    serverRead() {
      return null
    },
    parse(raw) {
      if (!raw) return empty()
      try {
        const parsed = JSON.parse(raw) as unknown
        return parsed && typeof parsed === 'object' ? (parsed as T) : empty()
      } catch {
        return empty()
      }
    },
    write(value) {
      try {
        sessionStorage.setItem(key, JSON.stringify(value))
      } catch {
        /* see read() */
      }
      window.dispatchEvent(new Event(event))
    },
    clear() {
      try {
        sessionStorage.removeItem(key)
      } catch {
        /* nothing to clean up */
      }
      window.dispatchEvent(new Event(event))
    },
  }
}
