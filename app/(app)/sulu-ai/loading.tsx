import { PendingRegion } from '@/components/skeletons'
import { cardClass, cn } from '@/lib/utils'

const pulse = 'animate-pulse rounded-lg bg-muted'

export default function SuluLoading() {
  return (
      <div
        className="mx-auto flex h-[calc(100dvh-8.5rem)] max-w-7xl gap-6 p-3 sm:p-8 md:h-dvh"
        aria-busy="true"
      >
        <PendingRegion label="Loading your conversations" />
        <aside className="hidden w-64 shrink-0 flex-col gap-2 rounded-2xl border border-border bg-card p-3 lg:flex">
          <div className={cn(pulse, 'h-9 w-full')} />
          <div className={cn(pulse, 'mt-4 h-3 w-24')} />
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn(pulse, 'h-14 w-full')} />
          ))}
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="mb-3 flex items-center gap-3 border-b border-border pb-4 sm:mb-5 sm:pb-5">
            <div className={cn(pulse, 'size-11 rounded-xl')} />
            <div className="space-y-2">
              <div className={cn(pulse, 'h-4 w-24')} />
              <div className={cn(pulse, 'h-3 w-40')} />
            </div>
          </header>
          <div className="min-h-0 flex-1" />
          <div className={cn(cardClass, 'h-16 shrink-0')} />
        </section>
      </div>
  )
}
