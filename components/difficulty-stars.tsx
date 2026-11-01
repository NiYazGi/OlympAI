import { Star } from 'lucide-react'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import { cn } from '@/lib/utils'

export function DifficultyStars({
  level,
  label,
  className,
}: {
  level: number
  /** The screen-reader label, which only the caller knows the language of. */
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'size-3.5',
            i < level ? 'fill-primary text-primary' : 'fill-muted text-muted-foreground/40',
          )}
        />
      ))}
    </span>
  )
}

/**
 * Three bands, and the key is what the filter stores.
 *
 * The label used to be the filter's value as well as its caption, which works
 * in exactly one language: selecting "Hard" compared the string "Hard" against
 * a string the same function produced. The key is now stable and the caption
 * is looked up.
 */
export type DifficultyKey = 'easy' | 'medium' | 'hard'

export function difficultyKey(level: number): DifficultyKey {
  if (level <= 2) return 'easy'
  if (level <= 3) return 'medium'
  return 'hard'
}

export function difficultyLabel(level: number, t: Dictionary): string {
  return t.bank[difficultyKey(level)]
}
