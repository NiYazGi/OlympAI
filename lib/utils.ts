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
