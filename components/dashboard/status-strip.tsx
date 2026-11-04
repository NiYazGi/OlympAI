import Link from 'next/link'
import { ArrowRight, CalendarDays, Flame, TriangleAlert, Zap } from 'lucide-react'
import { cardClass, cn } from '@/lib/utils'
import type { GoalPlan, Readiness } from '@/lib/goal'
import type { Goal, ProgressAnalytics } from '@/lib/types'
import { getT } from '@/lib/i18n/server'

/**
 * The day in one line, under the one thing to do.
 *
 * This replaces two cards: the XP ring with its level bar and week strip, and
 * the goal card with its readiness ring. Each was reasonable on its own; with
 * the day check-in and two charts below them the dashboard became a wall of
 * numbers with no clear place to look. Here each figure is said once, small,
 * and the detail lives on Progress.
 */
export async function StatusStrip({
  analytics,
  goal,
  plan,
  ready,
}: {
  analytics: ProgressAnalytics
  goal: Goal | null
  plan: GoalPlan | null
  ready: Readiness | null
}) {
  const t = await getT()
  const { xp, activeStreak } = analytics
  const share = xp.goal > 0 ? Math.min(100, Math.round((xp.today / xp.goal) * 100)) : 0
  const behind = plan && plan.remaining > 0 && !plan.onTrack

  return (
    <section className={cn(cardClass, 'p-4 sm:px-5')}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <Flame className={cn('size-4', activeStreak > 0 ? 'text-warning' : 'text-muted-foreground')} />
          <span className="font-medium tabular-nums">{t('{n} {n|day|days}', { n: activeStreak })}</span>
          <span className="text-muted-foreground">{t('in a row')}</span>
        </span>

        <span className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:max-w-64 sm:flex-1">
          <Zap className="size-4 shrink-0 text-primary" />
          <span className="shrink-0 tabular-nums">
            <span className="font-medium">{xp.today}</span>
            <span className="text-muted-foreground"> / {xp.goal} {t('XP today')}</span>
          </span>
          <span className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span
              className={cn('block h-full rounded-full', share >= 100 ? 'bg-success' : 'bg-primary')}
              style={{ width: `${share}%` }}
            />
          </span>
        </span>

        {goal && plan ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="max-w-52 truncate">{goal.competition?.name ?? goal.subjectName}</span>
            <span className="text-muted-foreground">
              · {t('{n} {n|day|days} left', { n: plan.daysLeft })}
              {ready ? ` · ${t('ready {n}%', { n: ready.percent })}` : ''}
            </span>
          </span>
        ) : (
          <Link href="/learn" prefetch className="text-primary hover:underline">
            {t('Set an olympiad and a date')}
          </Link>
        )}

        <Link
          href="/me"
          prefetch
          className="ml-auto inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('Progress')} <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {behind ? (
        <p className="mt-3 flex items-start gap-2 text-xs text-warning">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          {t('Behind pace: {n} {n|attempt|attempts} last week, target {target}.', { n: plan.currentPace, target: plan.tasksPerWeek })}
        </p>
      ) : null}
    </section>
  )
}
