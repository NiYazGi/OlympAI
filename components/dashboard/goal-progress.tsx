import Link from 'next/link'
import { ArrowRight, GraduationCap, TriangleAlert } from 'lucide-react'
import { ReadinessRing } from '@/components/path/goal-summary'
import { phaseCopy, type Phase } from '@/lib/day-state'
import { getT } from '@/lib/i18n'
import { workloadCopy, type GoalPlan, type Readiness } from '@/lib/goal'
import { cardClass, cn, labelClass } from '@/lib/utils'
import type { Goal } from '@/lib/types'

/**
 * The distance left, and the rule for the stretch the student is standing in.
 *
 * Everything above this on the dashboard measures a day. This measures the
 * run, which is the only thing that makes a bad day survivable — and the phase
 * line is where the schedule lives, because "ten to twelve hours" means
 * nothing except when read next to the date it starts applying.
 */
export async function GoalProgress({
  goal,
  plan,
  ready,
  phase,
  university,
}: {
  goal: Goal
  plan: GoalPlan
  ready: Readiness
  phase: Phase
  /** What the medal is for, when the student has written it down. */
  university?: string | null
}) {
  const t = await getT()
  const rule = phaseCopy(phase, t)

  return (
    <section className={cn(cardClass, 'flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6')}>
      <ReadinessRing ready={ready} t={t} />

      <div className="min-w-0 flex-1">
        <p className={labelClass}>{t.dashboard.preparingFor}</p>
        <h2 className="font-display mt-1 truncate text-xl font-bold tracking-[-0.02em]">
          {goal.competition?.name ?? goal.subjectName}
        </h2>

        {university ? (
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            <GraduationCap className="size-3.5 shrink-0" />
            {university}
          </p>
        ) : null}

        <p className="mt-3 text-sm text-muted-foreground">
          {t.dashboard.perWeek(plan.tasksPerWeek)} · {workloadCopy(plan.workload, t).label}
        </p>

        <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">
          <span className="text-foreground">{rule.label}.</span> {rule.rule}
        </p>

        {plan.remaining > 0 && !plan.onTrack ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning/10 p-2.5 text-sm text-warning">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {t.dashboard.behind(plan.currentPace, plan.tasksPerWeek)}
            </span>
          </p>
        ) : null}

        <Link
          href="/learn"
          prefetch
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          {t.dashboard.openPath} <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  )
}
