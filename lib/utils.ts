import type { CSSProperties } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Shared surface for custom cards: the keyboard-key stack on Ink, 16px radius.
export const cardClass = 'rounded-xl bg-card shadow-key'

/** Up to two uppercase initials for an avatar fallback. */
export function initials(fullName: string | null | undefined) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length === 0) return '?'
  return parts.map((part) => part[0]!.toUpperCase()).join('')
}

/**
 * Staggered entrance delay for the nth item of a list, to pair with `.rise`.
 *
 * Capped on purpose. Multiplying the delay by the index all the way down means
 * a catalogue of twenty problems takes a second and a half to finish appearing,
 * and the person reading item three is watching item nineteen arrive. After the
 * cap everything lands together, which still reads as a wave rather than a pop.
 */
export function riseDelay(index: number, step = 40, cap = 6): CSSProperties {
  return { '--rise-delay': `${Math.min(index, cap) * step}ms` } as CSSProperties
}

/** An inset well for hand-rolled form fields, matching components/ui/input. */
export const fieldClass =
  'h-11 w-full rounded-lg border border-input bg-card px-3 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:border-iron focus:border-foreground/50 focus:ring-3 focus:ring-foreground/10'

/** Inline style for a staggered scroll reveal (`data-reveal`) or entrance (`.enter`). */
export function delay(ms: number): CSSProperties {
  return { '--reveal-delay': `${ms}ms`, '--enter-delay': `${ms}ms` } as CSSProperties
}
