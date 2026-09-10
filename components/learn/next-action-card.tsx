import Link from 'next/link'
import { ArrowRight, BookOpen, Brain, ClipboardCheck, Compass, PartyPopper, PenLine, Timer } from 'lucide-react'
import type { NextAction, NextActionKind } from '@/lib/next-action'
import { Button } from '@/components/ui/button'
import { cardClass, cn } from '@/lib/utils'

const ICONS: Record<NextActionKind, React.ComponentType<{ className?: string }>> = {
  study: BookOpen,
  check: ClipboardCheck,
  recall: Brain,
  apply: PenLine,
  sit: Timer,
  'choose-subject': Compass,
  'empty-subject': Compass,
  done: PartyPopper,
}

/**
 * The instruction both study pages open with.
 *
 * One action, named, with the reason underneath. The reason is not decoration:
 * a trainer that says "do this" without saying why is a trainer a student
 * overrules the first time they disagree with it.
 */
/**
 * `hero` is for the dashboard, where this is the only instruction on the page
 * and has to look like it. The plain variant sits above a catalogue on /learn
 * and /tasks, where shouting would put it in competition with the list it is
 * meant to introduce.
 */
export function NextActionCard({
  action,
  tone = 'plain',
}: {
  action: NextAction
  tone?: 'plain' | 'hero'
}) {
  const Icon = ICONS[action.kind]
  const hero = tone === 'hero'

  return (
    <section
      className={cn(
        cardClass,
        'rise relative overflow-hidden p-5 sm:p-6',
        hero && 'bg-primary text-primary-foreground ring-0',
      )}
    >
      <div className="relative z-10 flex items-start gap-4">
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            hero ? 'bg-white/15 text-white' : 'bg-primary/15 text-primary',
          )}
        >
          <Icon className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-xs font-medium tracking-wide uppercase',
              hero ? 'text-white/70' : 'text-primary',
            )}
          >
            Do this now
          </p>
          <h2
            className={cn(
              'mt-1 leading-7 font-semibold text-balance',
              hero ? 'text-2xl tracking-tight' : 'text-lg',
            )}
          >
            {action.label}
          </h2>
          <p className={cn('mt-1 text-sm', hero ? 'text-white/75' : 'text-muted-foreground')}>
            {action.detail}
          </p>
          <p
            className={cn(
              'mt-3 border-l-2 pl-3 text-sm leading-6 text-pretty',
              hero ? 'border-white/25 text-white/75' : 'border-foreground/10 text-muted-foreground',
            )}
          >
            {action.why}
          </p>

          <Button
            className={cn('mt-4', hero && 'bg-white text-primary shadow-sm hover:bg-white/90')}
            size={hero ? 'lg' : 'default'}
            nativeButton={false}
            render={
              <Link href={action.href} prefetch>
                {action.cta} <ArrowRight className="size-4" />
              </Link>
            }
          />
        </div>
      </div>

      {hero ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-10 size-64 rounded-full border-[28px] border-white/10"
        />
      ) : null}
    </section>
  )
}

/**
 * The line that says whose material is on screen and how to see the rest.
 *
 * Shown wherever the catalogue has been narrowed. Hiding six subjects without
 * saying so would leave a student wondering where their other work went.
 */
export function ScopeNote({
  subject,
  scoped,
  hidden,
  allHref,
  focusHref,
}: {
  subject: string | null
  scoped: boolean
  hidden: number
  allHref: string
  focusHref: string
}) {
  if (!subject) {
    return (
      <p className="text-sm text-muted-foreground">
        Showing every subject.{' '}
        <Link href="/learn" prefetch className="text-primary underline-offset-4 hover:underline">
          Pick a target
        </Link>{' '}
        and this narrows to the one you are training for.
      </p>
    )
  }

  if (!scoped) {
    return (
      <p className="text-sm text-muted-foreground">
        Showing every subject.{' '}
        <Link href={focusHref} prefetch className="text-primary underline-offset-4 hover:underline">
          Back to {subject}
        </Link>
      </p>
    )
  }

  return (
    <p className="text-sm text-muted-foreground">
      Your target is <span className="font-medium text-foreground">{subject}</span>, so that is what
      is here.{' '}
      <Link href={allHref} prefetch className="text-primary underline-offset-4 hover:underline">
        {hidden === 1 ? 'One other subject' : `${hidden} other subjects`}
      </Link>{' '}
      ·{' '}
      <Link href="/learn" prefetch className="text-primary underline-offset-4 hover:underline">
        change target
      </Link>
    </p>
  )
}
