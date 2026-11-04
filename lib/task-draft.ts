/**
 * The student's unsent solution to a task, kept in the browser.
 *
 * The editor used to hold it in component state only, so a reload or a slip of
 * the back button threw away real work. It is written to localStorage on every
 * change, per task, and shared with the Sulu panel on the same page so "Check my
 * approach" can read what is actually in the editor.
 *
 * Storage can be missing or full (private windows, blocked site data); every
 * access is guarded and `save` reports whether the write held, so the editor can
 * say so instead of claiming a save that did not happen.
 *
 * Read through useSyncExternalStore, like lib/session-draft.ts: localStorage
 * rather than sessionStorage because a solution is worth keeping past the tab.
 */

const PREFIX = 'olympai-draft:'
const listeners = new Map<string, Set<() => void>>()
const memory = new Map<string, string>()

export function readDraft(taskId: string): string {
  if (memory.has(taskId)) return memory.get(taskId)!
  try {
    return window.localStorage.getItem(PREFIX + taskId) ?? ''
  } catch {
    return ''
  }
}

/** Returns false when the browser refused to store it. */
export function saveDraft(taskId: string, text: string): boolean {
  memory.set(taskId, text)
  for (const listener of listeners.get(taskId) ?? []) listener()
  try {
    if (text.trim()) window.localStorage.setItem(PREFIX + taskId, text)
    else window.localStorage.removeItem(PREFIX + taskId)
    return true
  } catch {
    return false
  }
}

export function subscribeDraft(taskId: string, listener: () => void) {
  const set = listeners.get(taskId) ?? new Set()
  set.add(listener)
  listeners.set(taskId, set)
  return () => {
    set.delete(listener)
  }
}
