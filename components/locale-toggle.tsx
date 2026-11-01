'use client'

import { useTransition } from 'react'
import { useLocale } from '@/components/i18n-provider'
import { setLocale } from '@/lib/i18n/actions'
import { LOCALE_NAMES, type Locale } from '@/lib/i18n/config'
import { cn } from '@/lib/utils'

/**
 * Shows the language you are reading and switches to the other one.
 *
 * Two letters rather than a globe. A globe says "there are languages here" and
 * nothing about which one is on; the code says both, and it is the same
 * control people already know from every other site that has two.
 */
export function LocaleToggle({ className }: { className?: string }) {
  const locale = useLocale()
  const [pending, startTransition] = useTransition()
  const next: Locale = locale === 'ru' ? 'en' : 'ru'

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setLocale(next))}
      aria-label={LOCALE_NAMES[next]}
      title={LOCALE_NAMES[next]}
      className={cn(
        'flex h-9 items-center justify-center rounded-lg px-2.5 pointer-coarse:h-11 pointer-coarse:min-w-11 font-mono text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-60',
        className,
      )}
    >
      {locale}
    </button>
  )
}
