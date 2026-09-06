'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { Check, Moon, Sun } from 'lucide-react'
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

const OPTIONS = [
  { value: 'dark' as const, label: 'Dark', icon: Moon, note: 'The default' },
  { value: 'light' as const, label: 'Light', icon: Sun, note: null },
]

export function Appearance() {
  // Dark on the server: it is the default, so this matches the markup.
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'dark' as const)

  const choose = useCallback((next: 'dark' | 'light') => {
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
    <div className="grid gap-2 sm:grid-cols-2">
      {OPTIONS.map((option) => {
        const active = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => choose(option.value)}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
              active
                ? 'border-primary bg-accent/60'
                : 'border-border hover:border-primary/40 hover:bg-accent/30',
            )}
          >
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {active ? <Check className="size-4" /> : <option.icon className="size-4" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{option.label}</span>
              {option.note ? (
                <span className="block text-xs text-muted-foreground">{option.note}</span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
