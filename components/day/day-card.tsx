import Link from 'next/link'
import { DayCheckIn } from '@/components/day/day-check-in'
import { AXIS_MAX, DAY_MAX, DAY_TARGET, phaseCopy, type Axis } from '@/lib/day-state'
import { getT } from '@/lib/i18n/server'
import type { Translate } from '@/lib/i18n/config'
import type { DayStatus } from '@/lib/supabase/day'
import { cardClass, cn } from '@/lib/utils'

/**
 * The day as a shape, and the five questions that draw it.
 *
 * The number on its own would be one more counter. What earns the space is the
 * line under it: you are three short, and here is where three costs least
 * tonight. That is the argument the whole panel exists to make — an hour of
 * sleep and an hour of problems are both worth points, and most evenings the
 * one you were not going to spend is the cheaper one.
 */
export async function DayCard({ status }: { status: DayStatus }) {
  const t = await getT()
  const { score } = status
  const phase = phaseCopy(score.phase, t)
  const weak = score.axes.filter((axis) => axis.score <= 2)

  return (
    <section className={cn(cardClass, 'p-5 sm:p-6')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-block font-semibold">{t('Today')}</h2>
        <p className="text-caption font-semibold text-muted-foreground">
          {phase.label}
          {status.daysLeft !== null ? ` · ${t('{n} d left', { n: status.daysLeft })}` : ''}
        </p>
      </div>

      {/* No radar: its outline is only readable once every axis has data, and
          the five rows below already say each value by name. */}
      <div className="mt-4">
        <div className="min-w-0 max-w-2xl">
          <p className="flex items-baseline gap-2">
            <span className="font-figure text-[2.75rem] leading-none font-extrabold tabular-nums">
              {score.total}
            </span>
            <span className="text-ui font-semibold text-muted-foreground">{t('/ {n}', { n: DAY_MAX })}</span>
            <span
              className={cn(
                'ml-auto rounded-sm px-2 py-0.5 text-xs font-semibold',
                score.met ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
              )}
            >
              {score.met ? t('above {n}', { n: DAY_TARGET }) : t('{n} short of {need}', { n: score.short, need: DAY_TARGET + 1 })}
            </span>
          </p>

          <ul className="mt-4 space-y-2">
            {score.axes.map((axis) => (
              <AxisRow key={axis.key} axis={axis} of={((a: number, b: number) => t('{a} of {b}', { a, b }))} />
            ))}
          </ul>

          {/* A total of 15 can be 5+5+5+0+0: the sum alone hides the axis that is failing. */}
          {status.recorded && weak.length ? (
            <p role="status" className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-sm text-pretty">
              {score.met
                ? t('The total is fine, but it hides an imbalance: {axes} at {n} or less out of 5.', { axes: weak.map((axis) => axis.label).join(', '), n: 2 })
                : t('Weakest today: {axes}. Start there — it moves the day most.', { axes: weak.map((axis) => axis.label).join(', ') })}
            </p>
          ) : null}

          <p className="mt-4 text-sm leading-6 text-pretty text-muted-foreground">
            {score.met
              ? phase.rule
              : score.cheapest
                ? `${score.cheapest.gap}. ${phase.rule}`
                : phase.rule}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-border/60 pt-5">
        <DayCheckIn inputs={status.inputs} />
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">{t('How the points are counted')}</summary>
          <ul className="mt-3 space-y-1.5 leading-6 text-muted-foreground">
            <li><span className="font-medium text-foreground">{t('Theory')}</span> — {t('minutes on notes and lectures against your session length; 5 points for the full theory share of a session.')}</li>
            <li><span className="font-medium text-foreground">{t('Solving')}</span> — {t('minutes on problems, or the work graded in the app today, whichever is higher.')}</li>
            <li><span className="font-medium text-foreground">{t('Head')}</span> — {t('how you feel, from 1 (in pieces) to 5 (sharp).')}</li>
            <li><span className="font-medium text-foreground">{t('Sleep')}</span> — {t('5 h, 6 h, 7 h, 7.5 h and 8 h each add a point.')}</li>
            <li><span className="font-medium text-foreground">{t('Taken')}</span> — {t('everything else that took time today (school, clubs, the road): under 8 h, 6.5 h, 5 h, 3.5 h and 2 h each add a point.')}</li>
            <li>{t('In the last two days before the olympiad, theory and solving score for resting, not for work.')}</li>
          </ul>
        </details>
        <Link
          href="/method"
          prefetch
          className="mt-4 inline-flex items-center text-ui font-semibold text-primary underline underline-offset-[3px]"
        >
          {t('Why these five')}
        </Link>
      </div>
    </section>
  )
}

function AxisRow({ axis, of }: { axis: Axis; of: (a: number, b: number) => string }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-14 shrink-0 text-muted-foreground">{axis.label}</span>
      <span className="flex shrink-0 gap-1" aria-hidden>
        {Array.from({ length: AXIS_MAX }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-1.5 w-4',
              index < axis.score ? 'bg-primary' : 'bg-foreground/10',
            )}
          />
        ))}
      </span>
      <span className="min-w-0 flex-1 truncate text-right text-muted-foreground">
        {axis.detail}
      </span>
      <span className="sr-only">{of(axis.score, AXIS_MAX)}</span>
    </li>
  )
}
