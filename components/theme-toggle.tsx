'use client'

import { Moon, Sun } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import { originOf, useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useTheme()
  const t = useT()

  return (
    <button
      type="button"
      onClick={(event) =>
        setTheme(theme === 'dark' ? 'light' : 'dark', originOf(event.currentTarget))
      }
      aria-label={theme === 'dark' ? t.nav.theme.toLight : t.nav.theme.toDark}
      className={cn(
        'flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground pointer-coarse:size-11',
        className,
      )}
    >
      {/* Keyed so the new icon turns in rather than being swapped in place. */}
      <span key={theme} className="flex">
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </span>
    </button>
  )
}
