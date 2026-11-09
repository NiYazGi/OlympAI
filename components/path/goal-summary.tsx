import Link from 'next/link'
import { ArrowRight, BookOpen, CalendarDays } from 'lucide-react'
import { GoalSetup } from '@/components/path/goal-setup'
import { TargetPicker } from '@/components/path/target-picker'
import type { Readiness } from '@/lib/goal'
import { formatDay } from '@/lib/i18n/config'
import { cardClass, cn } from '@/lib/utils'
import type { CompetitionOption, Goal } from '@/lib/types'
import { getLocale, getT } from '@/lib/i18n/server'

export async function GoalSummary({
  goal,
  competitions,
  subjects,
}: {
  goal: Goal
  competitions: CompetitionOption[]
  subjects: { id: string; name: string; taskCount: number }[]
}) {
  const [t, locale] = await Promise.all([getT(), getLocale()])

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
              {goal.targetDate ? formatDay(goal.targetDate, locale) : null}
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

      <Link href="/plan" className="mt-4 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline">
        {t('Preparation program')} <ArrowRight className="size-4" />
      </Link>
    </section>
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
