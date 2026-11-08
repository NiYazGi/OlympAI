'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import { THEME_COLOR, THEME_COOKIE, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

function current(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/** Switches the page at once, then remembers the choice for the server's next render. */
function apply(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  window.dispatchEvent(new Event('olympai:theme'))
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')
  useEffect(() => {
    // The server already put the class on <html>; read it back after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current())
    const sync = () => setTheme(current())
    window.addEventListener('olympai:theme', sync)
    return () => window.removeEventListener('olympai:theme', sync)
  }, [])
  return [theme, (next: Theme) => apply(next)] as const
}

/** A sun or a moon in the header, next to the language. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useT()
  const [theme, set] = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? t('Dark theme') : t('Light theme')
  return (
    <button
      type="button"
      onClick={() => set(next)}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground',
        className,
      )}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

/** Two buttons, for the settings page. */
export function ThemePicker({ className }: { className?: string }) {
  const t = useT()
  const [theme, set] = useTheme()
  return (
    <div role="radiogroup" aria-label={t('Theme')} className={cn('inline-flex gap-1 rounded-lg bg-foreground/[0.04] p-1', className)}>
      {(['light', 'dark'] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => set(value)}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors',
            theme === value ? 'bg-card text-foreground shadow-key' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {value === 'light' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          {value === 'light' ? t('Light') : t('Dark')}
        </button>
      ))}
    </div>
  )
}
