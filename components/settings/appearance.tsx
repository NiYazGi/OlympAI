'use client'

import { Check, Moon, Sun } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import { originOf, useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function Appearance() {
  const [theme, choose] = useTheme()
  const t = useT()
  const OPTIONS = [
    { value: 'dark' as const, label: t.settings.dark, icon: Moon, note: t.settings.theDefault },
    { value: 'light' as const, label: t.settings.light, icon: Sun, note: null },
  ]

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {OPTIONS.map((option) => {
        const active = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={(event) => choose(option.value, originOf(event.currentTarget))}
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
