import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DifficultyStars({
  level,
  className,
}: {
  level: number
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`Difficulty ${level} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'size-3.5',
            i < level
              ? 'fill-primary text-primary'
              : 'fill-muted text-muted-foreground/40',
          )}
        />
      ))}
    </span>
  )
}

export function difficultyLabel(level: number) {
  if (level <= 2) return 'Easy'
  if (level <= 3) return 'Medium'
  return 'Hard'
}
