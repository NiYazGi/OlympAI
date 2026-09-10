import type { CSSProperties } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Shared surface style for custom cards, matching the shadcn Card ring look.
export const cardClass =
  'rounded-xl bg-card ring-1 ring-foreground/10'

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
