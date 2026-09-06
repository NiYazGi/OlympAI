import { cardClass, cn } from '@/lib/utils'

const pulse = 'animate-pulse rounded-lg bg-muted'

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={cn(cardClass, 'space-y-3 p-4 sm:p-5')}>
          <div className={cn(pulse, 'h-3 w-20')} />
          <div className={cn(pulse, 'h-6 w-14')} />
          <div className={cn(pulse, 'h-2.5 w-24')} />
        </div>
      ))}
    </div>
  )
}

export function BlockSkeleton({ className }: { className?: string }) {
  return <div className={cn(pulse, 'h-40 w-full', className)} aria-hidden />
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cn(cardClass, 'flex items-center gap-4 p-4 sm:p-5')}>
          <div className="min-w-0 flex-1 space-y-2">
            <div className={cn(pulse, 'h-4 w-1/2')} />
            <div className={cn(pulse, 'h-3 w-1/3')} />
          </div>
          <div className={cn(pulse, 'h-4 w-20 shrink-0')} />
        </div>
      ))}
    </div>
  )
}

/** Announces that content is on its way without freezing the layout. */
export function PendingRegion({ label }: { label: string }) {
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {label}
    </span>
  )
}
