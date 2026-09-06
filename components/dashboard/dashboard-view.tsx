import Link from 'next/link'
import { ArrowRight, Clock, Library, Sparkles, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DailyGoal } from '@/components/dashboard/daily-goal'
import { GoalProgress } from '@/components/dashboard/goal-progress'
import { StatCards, type Stat } from '@/components/dashboard/stat-cards'
import { AccuracyTrendChart } from '@/components/charts'
import { EmptyState } from '@/components/empty-state'
import { difficultyLabel } from '@/components/difficulty-stars'
import { cardClass, cn } from '@/lib/utils'
import type { GoalPlan, Readiness } from '@/lib/goal'
import type { CatalogueTask, Goal, ProgressAnalytics } from '@/lib/types'

export function DashboardView({
  analytics,
  recommended,
  remaining,
  libraryEmpty,
  goal,
  plan,
  ready,
}: {
  analytics: ProgressAnalytics
  recommended: CatalogueTask | null
  remaining: number
  /** Distinct from `remaining === 0`: an empty library is not an achievement. */
  libraryEmpty: boolean
  goal: Goal | null
  plan: GoalPlan | null
  ready: Readiness | null
}) {
  const fresh = !analytics.hasData

  const stats: Stat[] = [
    {
      label: 'Attempts',
      value: String(analytics.totalAttempts),
      detail: fresh ? 'Nothing submitted yet' : 'Graded submissions',
      muted: fresh,
    },
    {
      label: 'Correct',
      value: String(analytics.correctAnswers),
      detail: fresh ? 'No accuracy yet' : `${analytics.accuracy}% accuracy`,
      muted: fresh,
    },
    {
      label: 'Streak',
      value: `${analytics.activeStreak}`,
      detail: analytics.activeStreak > 0 ? 'days in a row' : 'days — start one today',
      muted: analytics.activeStreak === 0,
    },
    {
      label: 'Total XP',
      value: analytics.xp.total.toLocaleString('en'),
      detail: fresh ? 'Earned by solving' : `Level ${analytics.xp.level}`,
      muted: fresh,
    },
  ]

  return (
    <div className="space-y-6 sm:space-y-8">
      {goal && plan && ready ? <GoalProgress goal={goal} plan={plan} ready={ready} /> : null}
      <DailyGoal analytics={analytics} />
      <StatCards stats={stats} />

      {libraryEmpty ? (
        <EmptyState
          icon={Library}
          title="No tasks are available yet"
          body="The task library has not been filled in for this workspace. Once it is, your next recommendation shows up here."
          action={{ href: '/sulu-ai', label: 'Ask Sulu something' }}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            {recommended ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Start here</h2>
                  <Link
                    href="/tasks"
                    prefetch
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {remaining} left to solve
                  </Link>
                </div>
                <div
                  className={cn(
                    cardClass,
                    'relative overflow-hidden bg-primary p-6 text-primary-foreground ring-0',
                  )}
                >
                  <div className="relative z-10">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-0 bg-white/15 text-white">
                        {recommended.subject}
                      </Badge>
                      <Badge className="border-0 bg-white/15 text-white">
                        {difficultyLabel(recommended.difficulty)}
                      </Badge>
                      {recommended.estimatedMinutes ? (
                        <span className="inline-flex items-center gap-1 text-xs text-white/75">
                          <Clock className="size-3.5" /> {recommended.estimatedMinutes} min
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-balance">
                      {recommended.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-white/75">
                      {recommended.topic}
                      {recommended.attempts > 0
                        ? ` · ${recommended.attempts} attempt${recommended.attempts === 1 ? '' : 's'} so far`
                        : fresh
                          ? ' · a good place to begin'
                          : ' · not attempted yet'}
                    </p>

                    <Button
                      size="lg"
                      nativeButton={false}
                      render={
                        <Link href={`/tasks/${recommended.id}`} prefetch>
                          Open task <ArrowRight className="size-4" />
                        </Link>
                      }
                      className="mt-6 bg-card text-primary hover:bg-white/90"
                    />
                  </div>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border-[28px] border-white/10"
                  />
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Target}
                title="Every task is solved"
                body="Nothing left in the library for now. Revisit an earlier write-up, or bring Sulu a problem of your own."
                action={{ href: '/sulu-ai', label: 'Open Sulu AI' }}
              />
            )}

            {analytics.accuracyTrend.length > 1 ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Accuracy by week</h2>
                  <Link
                    href="/me"
                    prefetch
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    See analytics
                  </Link>
                </div>
                <div className={cn(cardClass, 'p-5')}>
                  <AccuracyTrendChart data={analytics.accuracyTrend} height="h-56" />
                </div>
              </div>
            ) : null}
          </section>

          <aside className="space-y-6">
            <section className={cn(cardClass, 'p-5')}>
              <div className="flex items-center gap-2">
                <Target className="size-4 text-primary" />
                <h2 className="font-semibold">Focus next</h2>
              </div>
              {analytics.weakTopics.length ? (
                <ul className="mt-3 space-y-2">
                  {analytics.weakTopics.map((topic) => (
                    <li
                      key={topic}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                      {topic}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {fresh
                    ? 'Solve a task and the topics you find hardest will collect here.'
                    : 'Nothing below 70% right now — try something harder.'}
                </p>
              )}
            </section>

            {analytics.topics.length ? (
              <section className={cn(cardClass, 'p-5')}>
                <h2 className="font-semibold">Topic mastery</h2>
                <ul className="mt-3 space-y-3">
                  {analytics.topics.slice(0, 4).map((topic) => (
                    <li key={topic.topic}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">{topic.topic}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-primary">
                          {topic.mastery}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${topic.mastery}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className={cn(cardClass, 'p-5')}>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h2 className="font-semibold">Stuck on something?</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Sulu asks the question that unlocks the next step, rather than handing you the
                answer.
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full"
                nativeButton={false}
                render={
                  <Link href="/sulu-ai" prefetch>
                    Ask Sulu AI
                  </Link>
                }
              />
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
