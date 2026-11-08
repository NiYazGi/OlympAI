import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: ReactNode
  action?: { href: string; label: string }
  className?: string
}) {
  return (
    <section
      className={cn(
        cardClass,
        'flex flex-col items-start gap-1 px-6 py-8 sm:px-8 sm:py-10',
        className,
      )}
    >
      <Icon className="mb-3 size-6 text-muted-foreground" />
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="max-w-lg text-[15px] leading-6 text-pretty text-muted-foreground">{body}</p>
      {action ? (
        <Button
          className="mt-5"
          nativeButton={false}
          render={
            <Link href={action.href} prefetch>
              {action.label} <ArrowRight className="size-4" />
            </Link>
          }
        />
      ) : null}
    </section>
  )
}
