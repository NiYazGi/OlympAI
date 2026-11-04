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
        'spotlight flex flex-col items-center px-6 py-14 text-center sm:py-20',
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-graphite text-mist shadow-key-strong">
        <Icon className="size-6" />
      </div>
      <h2 className="mt-6 text-xl font-normal text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-pretty text-ash">{body}</p>
      {action ? (
        <Button
          className="mt-6"
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
