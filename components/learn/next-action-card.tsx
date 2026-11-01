import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Compass,
  PartyPopper,
  PenLine,
  Timer,
} from 'lucide-react'
import type { NextAction, NextActionKind } from '@/lib/next-action'
import { Button } from '@/components/ui/button'
import { getT } from '@/lib/i18n'
import { cardClass, cn } from '@/lib/utils'

const ICONS: Record<NextActionKind, React.ComponentType<{ className?: string }>> = {
  study: BookOpen,
  check: ClipboardCheck,
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
 *
 * One supporting line, never two. The card used to carry both the state
 * ("Opened, not finished.") and the reason ("You opened this and did not
 * finish it. Half-read is the worst place to leave a topic.") one under the
 * other, which is the same sentence twice. The hero has room for the reason;
 * above a catalogue, the state is the more useful half.
 */
export async function NextActionCard({
  action,
  tone = 'plain',
}: {
  action: NextAction
  tone?: 'plain' | 'hero'
}) {
  const t = await getT()
  const Icon = ICONS[action.kind]
  const hero = tone === 'hero'

  return (
    // One instruction with its reason, and one ink button. No label above the
    // heading and no icon tile beside it: the sentence is the instruction.
    <section className={cn(cardClass, 'rise p-5 sm:p-6', hero && 'sm:px-7 sm:py-6')}>
      <div className="flex items-start gap-4">
        {hero ? null : (
          <Icon className="mt-1 size-5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              'text-balance',
              hero
                ? 'font-display text-[1.75rem] leading-8 font-bold tracking-[-0.01em]'
                : 'font-display text-lg leading-7 font-semibold',
            )}
          >
            {action.label}
          </h2>
          <p className="mt-1.5 max-w-[60ch] text-ui text-pretty text-muted-foreground">
            {hero ? action.why : action.detail}
          </p>

          <Button
            className="mt-4"
            size={hero ? 'lg' : 'default'}
            nativeButton={false}
            render={
              <Link href={action.href} prefetch>
                {action.cta}
              </Link>
            }
          />
        </div>
      </div>
    </section>
  )
}

/**
 * The line that says whose material is on screen and how to see the rest.
 *
 * Shown wherever the catalogue has been narrowed. Hiding six subjects without
 * saying so would leave a student wondering where their other work went.
 */
export async function ScopeNote({
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
  const t = await getT()

  if (!subject) {
    return (
      <p className="text-sm text-muted-foreground">
        {t.learn.scopeAll}{' '}
        <Link href="/learn" prefetch className="text-primary underline-offset-4 hover:underline">
          {t.learn.scopePick}
        </Link>{' '}
        {t.learn.scopeNarrow}
      </p>
    )
  }

  if (!scoped) {
    return (
      <p className="text-sm text-muted-foreground">
        {t.learn.scopeAll}{' '}
        <Link href={focusHref} prefetch className="text-primary underline-offset-4 hover:underline">
          {t.learn.scopeBack(t.subjects[subject] ?? subject)}
        </Link>
      </p>
    )
  }

  return (
    <p className="text-sm text-muted-foreground">
      <span className="text-foreground">
        {t.learn.scopeBecause(t.subjects[subject] ?? subject)}
      </span>{' '}
      ·{' '}
      <Link href={allHref} prefetch className="text-primary underline-offset-4 hover:underline">
        {t.learn.scopeOther(hidden)}
      </Link>
    </p>
  )
}
