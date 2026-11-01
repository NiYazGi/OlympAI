import type { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cardClass, cn } from '@/lib/utils'

/**
 * One shape for every "nothing here yet" screen.
 *
 * They had drifted apart: some were centred cards, some plain paragraphs, and
 * the task library told students to "apply the migrations in
 * supabase/migrations", which is an instruction for whoever runs the server.
 */
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  /** Kept for the callers; an empty screen shows no picture, only what to do. */
  icon?: React.ComponentType<{ className?: string }>
  title: string
  body: ReactNode
  action?: { href: string; label: string }
  className?: string
}) {
  return (
    <section className={cn(cardClass, 'flex flex-col items-start px-6 py-8 sm:px-8 sm:py-10', className)}>
      <h2 className="font-display text-block font-semibold text-balance">{title}</h2>
      <p className="mt-2 max-w-[60ch] text-ui text-pretty text-muted-foreground">{body}</p>
      {action ? (
        <Button
          className="mt-5"
          nativeButton={false}
          render={
            <Link href={action.href} prefetch>
              {action.label}
            </Link>
          }
        />
      ) : null}
    </section>
  )
}
