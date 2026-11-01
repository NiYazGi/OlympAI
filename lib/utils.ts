import type { CSSProperties } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// A region of the plane: white, a 1px rule round it, and corners so slight
// they read as square. Shared with the shadcn Card so the two cannot drift.
export const cardClass =
  'rounded-sm bg-card ring-1 ring-border'

/**
 * For a card that opens something: under the pointer its edge brightens and it
 * picks up a shadow, so it reads as a thing to click before anyone reads it.
 * The catalogues had three different hover treatments, and a tile that only
 * changed its background looked the same as one that did nothing.
 *
 * Nothing moves. A card that lifts towards the cursor can also step out from
 * under it, and then the hover flickers on and off as the pointer crosses a
 * list.
 */
export const liftClass =
  'transition-colors duration-200 ease-out hover:bg-muted/60 hover:ring-foreground/40'

/**
 * The small print that names a panel or a figure, in the words' own case.
 *
 * It used to be mono, upper case and spaced out, which is the label every
 * generated dashboard wears; and the mono face is for figures here, not words.
 * Weight and colour separate it from the text it names.
 */
export const labelClass = 'text-caption font-semibold text-muted-foreground'

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
