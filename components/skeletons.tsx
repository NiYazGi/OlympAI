import type { ReactNode } from 'react'
import { BackLink } from '@/components/back-link'
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

/*
 * Route skeletons.
 *
 * A page that has to fetch before it can render anything gets a loading.tsx
 * built from these, and each is drawn to the shape of the page it stands in
 * for — same column width, same header, the same cards in the same places —
 * so the handover moves nothing but the content itself. The app used to have
 * one loading screen for every route, shaped like the dashboard, which turned
 * the topic page, the lesson and the quiz into a flash of the wrong layout.
 *
 * Whatever is fixed text on the real page (a title like "Recall", a link
 * like "Back to problems") is real text here too.
 */

/** The page column, at the width the real page uses. `label` is what a screen reader hears. */
export function RouteSkeleton({
  width,
  label,
  children,
}: {
  width: 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl' | 'max-w-6xl' | 'max-w-7xl'
  label: string
  children: ReactNode
}) {
  return (
    <div className={cn('mx-auto flex flex-col gap-5 p-4 sm:gap-6 sm:p-8', width)} aria-busy="true">
      <PendingRegion label={label} />
      {children}
    </div>
  )
}

/** A back link whose label comes from data, so only its shape is known. */
export function BackLinkSkeleton({ label }: { label?: { href: string; text: string } }) {
  if (label) return <BackLink href={label.href}>{label.text}</BackLink>
  return <div className={cn(pulse, 'h-5 w-32')} aria-hidden />
}

/** Mirrors PageHeader: a title line, a description line, an optional note. */
export function HeaderSkeleton({
  title,
  titleWidth = 'w-56',
  description = true,
  note = false,
  aside,
}: {
  title?: string
  titleWidth?: string
  description?: boolean
  note?: boolean
  aside?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {title ? (
          <h1 className="font-display text-page font-bold tracking-[-0.02em] text-balance">
            {title}
          </h1>
        ) : (
          <div className="flex h-8 items-center">
            <div className={cn(pulse, 'h-6 max-w-full', titleWidth)} />
          </div>
        )}
        {description ? (
          <div className="flex h-5 items-center">
            <div className={cn(pulse, 'h-3.5 w-40')} />
          </div>
        ) : null}
        {note ? (
          <div className="flex h-6 items-end">
            <div className={cn(pulse, 'h-3.5 w-72 max-w-full')} />
          </div>
        ) : null}
      </div>
      {aside}
    </div>
  )
}

/** The four rungs on a topic page. */
export function StageListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={cn(cardClass, 'flex items-start gap-4 p-4 sm:p-5')}>
          <div className={cn(pulse, 'size-10 shrink-0 rounded-xl')} />
          <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
            <div className={cn(pulse, 'h-4 w-28')} />
            <div className={cn(pulse, 'h-3.5 w-4/5')} />
            <div className={cn(pulse, 'h-3.5 w-1/3')} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** A lesson: the summary, then its blocks. */
export function LessonSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="space-y-2">
        <div className={cn(pulse, 'h-4 w-full')} />
        <div className={cn(pulse, 'h-4 w-2/3')} />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className={cn(cardClass, 'space-y-3 p-5 sm:p-6')}>
          <div className={cn(pulse, 'h-3 w-24')} />
          <div className={cn(pulse, 'h-5 w-1/2')} />
          <div className="space-y-2 pt-1">
            <div className={cn(pulse, 'h-3.5 w-full')} />
            <div className={cn(pulse, 'h-3.5 w-11/12')} />
            <div className={cn(pulse, 'h-3.5 w-3/4')} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** One question and its four options. */
export function QuizSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="flex items-center justify-between">
        <div className={cn(pulse, 'h-4 w-28')} />
        <div className={cn(pulse, 'h-4 w-16')} />
      </div>
      <div className="h-1 w-full rounded-full bg-muted" />
      <div className={cn(cardClass, 'p-5 sm:p-6')}>
        <div className={cn(pulse, 'h-5 w-4/5')} />
        <div className={cn(pulse, 'mt-2 h-5 w-1/2')} />
        <div className="mt-5 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg ring-1 ring-foreground/10" />
          ))}
        </div>
      </div>
    </div>
  )
}

/** The card in the middle of the deck, and the button under it. */
export function CardDeckSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className={cn(pulse, 'h-4 w-14')} />
          <div className={cn(pulse, 'h-4 w-20')} />
        </div>
        <div className={cn(pulse, 'h-3 w-3/4')} />
        <div className={cn(cardClass, 'flex min-h-56 flex-col justify-center gap-2 p-6 sm:p-8')}>
          <div className={cn(pulse, 'h-5 w-3/4')} />
          <div className={cn(pulse, 'h-5 w-1/2')} />
        </div>
        <div className={cn(pulse, 'h-9 w-full')} />
      </div>
      <div className={cn(cardClass, 'h-24')} />
    </div>
  )
}

/** A problem page: the statement on the left, the answer panel on the right. */
export function TaskSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-5" aria-hidden>
      <div className="flex flex-col gap-6 lg:col-span-3">
        <div className={cn(cardClass, 'space-y-3 p-6')}>
          <div className={cn(pulse, 'h-3.5 w-20')} />
          <div className="space-y-2 pt-1">
            <div className={cn(pulse, 'h-4 w-full')} />
            <div className={cn(pulse, 'h-4 w-11/12')} />
            <div className={cn(pulse, 'h-4 w-4/5')} />
            <div className={cn(pulse, 'h-4 w-2/3')} />
          </div>
        </div>
        <div className={cn(cardClass, 'space-y-3 p-6')}>
          <div className={cn(pulse, 'h-3.5 w-16')} />
          <div className={cn(pulse, 'h-4 w-1/2')} />
          <div className={cn(pulse, 'h-4 w-2/5')} />
        </div>
      </div>
      <div className="space-y-4 lg:col-span-2">
        <div className={cn(pulse, 'h-4 w-28')} />
        <div className={cn(pulse, 'h-3 w-3/4')} />
        <div className="min-h-56 rounded-lg border border-input sm:min-h-72" />
        <div className={cn(pulse, 'h-11 w-full sm:w-40')} />
      </div>
    </div>
  )
}

/** A paper: the clock bar, then its questions. */
export function PaperSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className={cn(cardClass, 'flex items-center justify-between gap-3 p-4')}>
        <div className={cn(pulse, 'h-5 w-48')} />
        <div className={cn(pulse, 'h-8 w-32')} />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className={cn(cardClass, 'space-y-3 p-5 sm:p-6')}>
          <div className={cn(pulse, 'h-5 w-1/2')} />
          <div className={cn(pulse, 'h-4 w-full')} />
          <div className={cn(pulse, 'h-4 w-4/5')} />
          <div className="mt-4 h-40 rounded-lg border border-input" />
        </div>
      ))}
    </div>
  )
}
