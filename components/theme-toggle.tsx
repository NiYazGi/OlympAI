'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

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
function readTheme(): 'dark' | 'light' {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

export function ThemeToggle({ className }: { className?: string }) {
  // Dark on the server: it is the default, so this matches the markup.
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'dark' as const)

  const toggle = useCallback(() => {
    const next = readTheme() === 'dark' ? 'light' : 'dark'
    const root = document.documentElement
    root.classList.toggle('light', next === 'light')
    root.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Private browsing: the choice holds for this page only.
    }
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground',
        className,
      )}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
