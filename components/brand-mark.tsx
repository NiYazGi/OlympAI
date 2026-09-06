import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-xl',
          light ? 'bg-card text-primary' : 'bg-primary text-primary-foreground',
        )}
      >
        <Sparkles className="size-4" />
      </span>
      <span className={cn('text-lg font-semibold tracking-tight', light && 'text-white')}>
        OlympAI
      </span>
    </span>
  )
}