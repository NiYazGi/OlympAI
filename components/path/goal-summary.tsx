import Link from 'next/link'
import { ArrowRight, BookOpen, CalendarDays, Gauge, TriangleAlert } from 'lucide-react'
import { RING_LENGTH, ringStyle } from '@/components/meter'
import { GoalSetup } from '@/components/path/goal-setup'
import { TargetPicker } from '@/components/path/target-picker'
import { workloadCopy, type GoalPlan, type Readiness } from '@/lib/goal'
import { getT } from '@/lib/i18n'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import { cardClass, cn } from '@/lib/utils'
import type { CompetitionOption, Goal } from '@/lib/types'
import type { PathTask } from '@/lib/path'

const WORKLOAD_TONE: Record<GoalPlan['workload'], string> = {
  light: 'text-success',
  steady: 'text-primary',
  demanding: 'text-warning',
  unrealistic: 'text-destructive',
}

export async function GoalSummary({
  goal,
  plan,
  ready,
  competitions,
  subjects,
  next,
}: {
  goal: Goal
  plan: GoalPlan
  ready: Readiness
  competitions: CompetitionOption[]
  subjects: { id: string; name: string; taskCount: number }[]
  next: PathTask | null
}) {
  const t = await getT()
  const workload = workloadCopy(plan.workload, t)

  return (
    <section className={cn(cardClass, 'p-5 sm:p-6')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-caption font-semibold text-muted-foreground">
            {t.dashboard.preparingFor}
          </p>
          <h2 className="font-display mt-1 text-2xl leading-tight font-bold tracking-[-0.03em] text-balance">
            {goal.competition?.name ?? goal.subjectName}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="size-3.5" />
              {goal.subjectName ? (t.subjects[goal.subjectName] ?? goal.subjectName) : null}
              {goal.subjectLocked ? t.learn.setBySubject : ''}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {t.common.daysLeft(plan.daysLeft)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/*
            A generic target — a national round, say — names no subject, so the
            student has to be able to change it. Without this the subject was
            writable exactly once and then frozen, which is how an account that
            answered "Economics" at setup ended up stuck on a physics path.
          */}
          {goal.subjectLocked ? null : (
            <TargetPicker subjects={subjects} current={goal.subjectId} compact />
          )}
          <GoalSetup
            competitions={competitions}
            currentId={goal.competition?.id ?? null}
            currentDate={goal.targetDate}
            compact
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <ReadinessRing ready={ready} t={t} />

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Figure label={t.learn.summary.perWeek} value={t.learn.tasksCount(plan.tasksPerWeek)} />
            <Figure label={t.learn.summary.time} value={`~${t.common.minutes(plan.minutesPerWeek)}`} />
            <Figure
              label={t.learn.summary.load}
              value={workload.label}
              className={WORKLOAD_TONE[plan.workload]}
            />
          </div>

          {plan.remaining > 0 ? (
            <p
              className={cn(
                'flex items-start gap-2 rounded-lg p-3 text-sm',
                plan.onTrack
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-warning/10 text-warning',
              )}
            >
              {plan.onTrack ? (
                <Gauge className="mt-0.5 size-4 shrink-0" />
              ) : (
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              )}
              <span>
                {t.learn.paceLine(
                  plan.onTrack ? t.learn.onTrack : t.learn.behindPace,
                  plan.currentPace,
                  plan.tasksPerWeek,
                )}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {next ? (
        <Link
          href={`/tasks/${next.id}`}
          prefetch
          className="group mt-6 flex items-center justify-between gap-3 rounded-xl bg-primary/10 p-4 ring-1 ring-primary/25 transition-colors hover:bg-primary/15"
        >
          <span className="min-w-0">
            <span className="block text-caption font-semibold text-primary">
              {t.learn.nextUp}
            </span>
            <span className="font-display mt-0.5 block truncate text-lg font-bold">
              {next.title}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      ) : (
        <p className="mt-6 rounded-xl bg-accent p-4 text-sm text-accent-foreground">
          {t.learn.allSolved}
        </p>
      )}
    </section>
  )
}

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 font-semibold', className)}>{value}</p>
    </div>
  )
}

/** Shows the two components as well as the score, so it is not a black box. */
export function ReadinessRing({
  ready,
  t,
  size = 'size-32',
}: {
  ready: Readiness
  t: Dictionary
  size?: string
}) {
  return (
    <div className="mx-auto sm:mx-0">
      <div className={cn('relative', size)}>
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-muted" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className="ring-fill stroke-primary"
            style={ringStyle()}
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - Math.min(1, ready.percent / 100))}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl leading-none font-bold tabular-nums">{ready.percent}%</span>
          <span className="mt-1 text-caption font-semibold text-muted-foreground">
            {t.goal.ready}
          </span>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {t.goal.covered(ready.coverage)}
        {ready.quality !== null ? ` · ${t.goal.accurate(ready.quality)}` : ''}
      </p>
    </div>
  )
}
