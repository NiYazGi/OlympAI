import Link from 'next/link'
import { ArrowRight, CalendarDays, Flag, TriangleAlert } from 'lucide-react'
import { ReadinessRing } from '@/components/path/goal-summary'
import { WORKLOAD_COPY, type GoalPlan, type Readiness } from '@/lib/goal'
import { cardClass, cn } from '@/lib/utils'
import type { Goal } from '@/lib/types'

/**
 * How close the student is to the thing they actually care about, on the first
 * screen. Everything else on the dashboard measures activity; this measures the
 * distance left.
 */
export function GoalProgress({
  goal,
  plan,
  ready,
}: {
  goal: Goal
  plan: GoalPlan
  ready: Readiness
}) {
  return (
    <section className={cn(cardClass, 'flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6')}>
      <ReadinessRing ready={ready} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Flag className="size-3.5" />
          Preparing for
        </p>
        <h2 className="mt-1 truncate text-lg font-semibold">
          {goal.competition?.name ?? goal.subjectName}
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {plan.daysLeft} day{plan.daysLeft === 1 ? '' : 's'} left
          </span>
          <span>
            {plan.tasksPerWeek} task{plan.tasksPerWeek === 1 ? '' : 's'}/week ·{' '}
            {WORKLOAD_COPY[plan.workload].label.toLowerCase()}
          </span>
        </div>

        {plan.remaining > 0 && !plan.onTrack ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5 text-sm text-amber-500">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Behind pace: {plan.currentPace} attempt{plan.currentPace === 1 ? '' : 's'} last week,
              target {plan.tasksPerWeek}.
            </span>
          </p>
        ) : null}

        <Link
          href="/learn"
          prefetch
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Open your path <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  )
}
