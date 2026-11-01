import Link from 'next/link'
import { ArrowRight, BookOpen, Brain, Check, ClipboardCheck, PenLine, Timer } from 'lucide-react'
import { Meter } from '@/components/meter'
import type { LadderStage, StageKey } from '@/lib/ladder'
import { getT } from '@/lib/i18n'
import { cardClass, cn, liftClass, riseDelay } from '@/lib/utils'

const ICONS: Record<StageKey, React.ComponentType<{ className?: string }>> = {
  study: BookOpen,
  check: ClipboardCheck,
  recall: Brain,
  apply: PenLine,
  sit: Timer,
}

/**
 * The four rungs, in order, with the next one to do picked out.
 *
 * A rung with no content behind it stays visible and says so. Hiding it would
 * make the ladder look complete when it is only unwritten, and a student who
 * cannot see that mechanics has no cards yet has no way to ask for them.
 *
 * Only the next rung explains itself. Four rungs each carrying a line of state
 * and a line of description is eight lines of prose to get past on the way to
 * a button, and by the second visit the descriptions are furniture — the one
 * you have not done yet is the only one still worth a sentence.
 */
export async function StageList({
  stages,
  next,
}: {
  stages: LadderStage[]
  next: LadderStage | null
}) {
  const t = await getT()

  return (
    <ol className="space-y-3">
      {stages.map((stage, index) => {
        const Icon = ICONS[stage.key]
        const isNext = next?.key === stage.key
        const empty = stage.state === 'empty'
        const done = stage.state === 'done'

        const inner = (
          <div
            className={cn(
              cardClass,
              'flex items-start gap-4 p-4 sm:p-5',
              stage.href && liftClass,
              isNext && 'ring-2 ring-primary/60 hover:ring-primary/80',
              empty && 'opacity-60',
            )}
          >
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl',
                done
                  ? 'bg-primary/15 text-primary'
                  : empty
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-accent text-primary',
              )}
            >
              {done ? <Check className="size-5" /> : <Icon className="size-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <h3 className="font-semibold">{stage.label}</h3>
                {isNext ? (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    {t.ladder.next}
                  </span>
                ) : null}
                {done ? (
                  <span className="text-xs font-medium text-primary">{t.ladder.done}</span>
                ) : null}
              </div>

              <p className={cn('mt-1 text-sm', empty ? 'text-muted-foreground' : 'font-medium')}>
                {stage.detail}
              </p>
              {isNext ? (
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{stage.blurb}</p>
              ) : null}

              {!empty && stage.percent > 0 ? (
                <Meter value={stage.percent} className="mt-3 h-1" />
              ) : null}
            </div>

            {stage.href ? (
              <ArrowRight className="mt-2.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
            ) : null}
          </div>
        )

        return (
          <li key={stage.key} className="rise" style={riseDelay(index, 50)}>
            {stage.href ? (
              <Link href={stage.href} prefetch className="group block rounded-xl">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        )
      })}
    </ol>
  )
}
