import Link from 'next/link'
import { ArrowRight, BookOpen, Brain, ClipboardCheck, Compass, PartyPopper, PenLine, Timer } from 'lucide-react'
import type { NextAction, NextActionKind } from '@/lib/next-action'
import { Button } from '@/components/ui/button'
import { cardClass, cn } from '@/lib/utils'
import { getT } from '@/lib/i18n/server'

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
    <section className={cn(cardClass, 'rise p-6', hero && 'sm:p-8')}>
      <div className="flex items-start gap-4">
        <Icon className={cn('mt-1 shrink-0 text-muted-foreground', hero ? 'size-6' : 'size-5')} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-coral">{t('Next step')}</p>
          <h2
            className={cn(
              'mt-1 leading-tight text-balance text-foreground',
              hero ? 'text-[26px] font-semibold tracking-[-0.015em]' : 'text-lg font-semibold',
            )}
          >
            {action.label}
          </h2>
          <p className="mt-1.5 text-[15px] text-muted-foreground">{action.detail}</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-pretty text-muted-foreground">{action.why}</p>

          <Button
            className="mt-5"
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
        {t('Showing every subject.')}{' '}
        <Link href="/learn" prefetch className="text-primary underline-offset-4 hover:underline">
          {t('Pick a target')}
        </Link>{' '}
        {t('and this narrows to the one you are training for.')}
      </p>
    )
  }

  if (!scoped) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('Showing every subject.')}{' '}
        <Link href={focusHref} prefetch className="text-primary underline-offset-4 hover:underline">
          {t('Back to')} {subject}
        </Link>
      </p>
    )
  }

  return (
    <p className="text-sm text-muted-foreground">
      {t('Your target is')} <span className="font-medium text-foreground">{subject}</span>{t(', so that is what is here.')}{' '}
      <Link href={allHref} prefetch className="text-primary underline-offset-4 hover:underline">
        {hidden === 1 ? t('One other subject') : t('{n} other subjects', { n: hidden })}
      </Link>{' '}
      ·{' '}
      <Link href="/learn" prefetch className="text-primary underline-offset-4 hover:underline">
        {t('change target')}
      </Link>
    </p>
  )
}
