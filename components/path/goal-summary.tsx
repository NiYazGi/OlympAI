import Link from 'next/link'
import { ArrowRight, BookOpen, CalendarDays, Gauge, TriangleAlert } from 'lucide-react'
import { GoalSetup } from '@/components/path/goal-setup'
import { TargetPicker } from '@/components/path/target-picker'
import { WORKLOAD_COPY, type GoalPlan, type Readiness } from '@/lib/goal'
import { cardClass, cn } from '@/lib/utils'
import type { CompetitionOption, Goal } from '@/lib/types'
import type { PathTask } from '@/lib/path'

const WORKLOAD_TONE: Record<GoalPlan['workload'], string> = {
  light: 'text-emerald-500',
  steady: 'text-primary',
  demanding: 'text-amber-500',
  unrealistic: 'text-destructive',
}

export function GoalSummary({
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
  const workload = WORKLOAD_COPY[plan.workload]

  return (
    <section className={cn(cardClass, 'p-5 sm:p-6')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Preparing for
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-balance">
            {goal.competition?.name ?? goal.subjectName}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="size-3.5" />
              {goal.subjectName}
              {goal.subjectLocked ? ' (set by the competition)' : ''}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {plan.daysLeft} day{plan.daysLeft === 1 ? '' : 's'} left
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
        <ReadinessRing ready={ready} />

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Figure label="Per week" value={`${plan.tasksPerWeek} task${plan.tasksPerWeek === 1 ? '' : 's'}`} />
            <Figure label="Time" value={`~${plan.minutesPerWeek} min`} />
            <Figure
              label="Load"
              value={workload.label}
              className={WORKLOAD_TONE[plan.workload]}
            />
          </div>

          <p className="text-sm leading-6 text-muted-foreground">{workload.note}</p>

          {plan.remaining > 0 ? (
            <p
              className={cn(
                'flex items-start gap-2 rounded-lg p-3 text-sm',
                plan.onTrack
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-amber-500/10 text-amber-500',
              )}
            >
              {plan.onTrack ? (
                <Gauge className="mt-0.5 size-4 shrink-0" />
              ) : (
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              )}
              <span>
                {plan.onTrack
                  ? `On track — ${plan.currentPace} attempt${plan.currentPace === 1 ? '' : 's'} in the last week against a target of ${plan.tasksPerWeek}.`
                  : `Behind pace — ${plan.currentPace} attempt${plan.currentPace === 1 ? '' : 's'} last week against a target of ${plan.tasksPerWeek}.`}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {next ? (
        <Link
          href={`/tasks/${next.id}`}
          prefetch
          className="mt-6 flex items-center justify-between gap-3 rounded-xl bg-primary p-4 text-primary-foreground transition-opacity hover:opacity-95"
        >
          <span className="min-w-0">
            <span className="block text-xs uppercase tracking-wide text-primary-foreground/70">
              Next up
            </span>
            <span className="mt-0.5 block truncate font-medium">{next.title}</span>
          </span>
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      ) : (
        <p className="mt-6 rounded-xl bg-accent p-4 text-sm text-accent-foreground">
          Every task in this subject is solved. Move the date forward, or pick a harder target.
        </p>
      )}
    </section>
  )
}

function Figure({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 font-semibold', className)}>{value}</p>
    </div>
  )
}

const RING = 2 * Math.PI * 52

/** Shows the two components as well as the score, so it is not a black box. */
export function ReadinessRing({ ready, size = 'size-32' }: { ready: Readiness; size?: string }) {
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
            className="stroke-primary transition-[stroke-dashoffset] duration-700"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - Math.min(1, ready.percent / 100))}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{ready.percent}%</span>
          <span className="text-xs text-muted-foreground">ready</span>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {ready.coverage}% covered
        {ready.quality !== null ? ` · ${ready.quality}% accurate` : ''}
      </p>
    </div>
  )
}
