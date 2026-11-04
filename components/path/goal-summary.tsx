import Link from 'next/link'
import { ArrowRight, BookOpen, CalendarDays, Gauge, TriangleAlert } from 'lucide-react'
import { GoalSetup } from '@/components/path/goal-setup'
import { TargetPicker } from '@/components/path/target-picker'
import { WORKLOAD_COPY, type GoalPlan, type Readiness } from '@/lib/goal'
import { cardClass, cn } from '@/lib/utils'
import type { CompetitionOption, Goal } from '@/lib/types'
import type { PathTask } from '@/lib/path'
import { getT } from '@/lib/i18n/server'

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

  const workload = WORKLOAD_COPY[plan.workload]

  return (
    <section className={cn(cardClass, 'p-5 sm:p-6')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">
            {t('Preparing for')}
          </p>
          <h2 className="mt-1 text-2xl font-medium text-balance">
            {goal.competition?.name ?? goal.subjectName}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="size-3.5" />
              {goal.subjectName}
              {goal.subjectLocked ? t(' (set by the competition)') : ''}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {t('{n} {n|day|days} left', { n: plan.daysLeft })}
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
            <Figure label={t('Per week')} value={t('{n} {n|task|tasks}', { n: plan.tasksPerWeek })} />
            <Figure label={t('Time')} value={t('~{n} min', { n: plan.minutesPerWeek })} />
            <Figure
              label={t('Load')}
              value={t(workload.label)}
              className={WORKLOAD_TONE[plan.workload]}
            />
          </div>

          <p className="text-sm leading-6 text-muted-foreground">{t(workload.note)}</p>

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
                {plan.onTrack
                  ? t('On track — {currentPace} attempts in the last week against a target of {tasksPerWeek}.', { currentPace: plan.currentPace, tasksPerWeek: plan.tasksPerWeek })
                  : t('Behind pace — {currentPace} attempts last week against a target of {tasksPerWeek}.', { currentPace: plan.currentPace, tasksPerWeek: plan.tasksPerWeek })}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {next ? (
        <Link
          href={`/tasks/${next.id}`}
          prefetch
          className="spotlight lift mt-6 flex items-center justify-between gap-3 rounded-xl surface-ember p-4 text-foreground"
        >
          <span className="min-w-0">
            <span className="eyebrow block text-destructive">
              {t('Next up')}
            </span>
            <span className="mt-1.5 block truncate font-medium">{next.title}</span>
          </span>
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      ) : (
        <p className="mt-6 rounded-xl bg-foreground/[0.04] p-4 text-sm text-ash shadow-key">
          {t('Every task in this subject is solved. Move the date forward, or pick a harder target.')}
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
export async function ReadinessRing({ ready, size = 'size-32' }: { ready: Readiness; size?: string }) {
  const t = await getT()

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
          <span className="text-xs text-muted-foreground">{t('ready')}</span>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {ready.coverage}{t('% covered')}
        {ready.quality !== null ? t(' · {quality}% accurate', { quality: ready.quality }) : ''}
      </p>
    </div>
  )
}
