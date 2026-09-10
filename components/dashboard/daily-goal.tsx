import Link from 'next/link'
import { Flame, Zap } from 'lucide-react'
import { cardClass, cn } from '@/lib/utils'
import type { ProgressAnalytics } from '@/lib/types'

/** Circumference of an r=52 circle, for the dash-offset trick. */
const RING = 2 * Math.PI * 52

/**
 * The daily goal, the level and the streak in one block.
 *
 * All three read from attempts rather than a stored counter, so they cannot
 * disagree with the history that produced them — and a change to the XP rules
 * re-scores every account rather than leaving old numbers frozen.
 */
export function DailyGoal({ analytics }: { analytics: ProgressAnalytics }) {
  const { xp, activeStreak } = analytics
  const reached = xp.today >= xp.goal
  const share = xp.goal > 0 ? Math.min(1, xp.today / xp.goal) : 0

  // A fresh account has no activity rows at all, so the week strip rendered as
  // nothing — the one place a beginner most needs to see the shape of a habit.
  const week =
    analytics.recentActivity.length > 0
      ? analytics.recentActivity
      : Array.from({ length: 7 }, (_, index) => ({ day: `d${index}`, problems: 0 }))

  return (
    <section className={cn(cardClass, 'flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6')}>
      <div className="relative mx-auto size-32 shrink-0 sm:mx-0">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-muted" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className={cn(
              'transition-[stroke-dashoffset] duration-700',
              reached ? 'stroke-emerald-500' : 'stroke-primary',
            )}
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - share)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{xp.today}</span>
          <span className="text-xs text-muted-foreground">of {xp.goal} XP</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Daily XP goal</h2>
          {reached ? (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-500">
              Done for today
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {reached
            ? 'Goal met. Anything more today is a bonus.'
            : `${xp.goal - xp.today} XP to go — a solved problem, or a quiz you have not answered yet.`}
        </p>
        {/* Saying the rule beats leaving a student to infer it from a number
            that did not move. Reviews and "mark as read" are self-reported, so
            they move the topic and not the level. */}
        <p className="mt-1 text-xs text-muted-foreground">
          XP comes from graded work: solved problems and first-time quiz answers.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                <Zap className="size-3.5 text-primary" /> Level {xp.level}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {xp.intoLevel}/{xp.levelSpan}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${xp.levelPercent}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {xp.toNextLevel} XP to level {xp.level + 1}
            </p>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              <Flame
                className={cn('size-3.5', activeStreak > 0 ? 'text-orange-400' : 'text-muted-foreground')}
              />
              {activeStreak} day{activeStreak === 1 ? '' : 's'}
            </span>
            <div className="mt-2 flex gap-1">
              {week.map((day, index) => (
                <div
                  key={`${day.day}-${index}`}
                  title={`${day.day}: ${day.problems} attempt${day.problems === 1 ? '' : 's'}`}
                  className={cn(
                    // A bare bg-muted square is invisible against the card in
                    // the dark theme, so empty days carry an outline instead.
                    'h-6 flex-1 rounded',
                    day.problems > 0
                      ? 'bg-primary'
                      : 'border border-dashed border-border bg-transparent',
                  )}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {activeStreak > 0 ? 'Keep it alive' : 'Solve one task to start'}
            </p>
          </div>
        </div>

        <Link
          href="/learn"
          prefetch
          className="mt-5 inline-block text-sm font-medium text-primary hover:underline"
        >
          See your full path →
        </Link>
      </div>
    </section>
  )
}
