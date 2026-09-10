import Link from 'next/link'
import { Library, TrendingUp } from 'lucide-react'
import { DailyGoal } from '@/components/dashboard/daily-goal'
import { GoalProgress } from '@/components/dashboard/goal-progress'
import { NextActionCard } from '@/components/learn/next-action-card'
import { AccuracyTrendChart } from '@/components/charts'
import { EmptyState } from '@/components/empty-state'
import { cardClass, cn, riseDelay } from '@/lib/utils'
import type { GoalPlan, Readiness } from '@/lib/goal'
import type { NextAction } from '@/lib/next-action'
import type { Goal, ProgressAnalytics } from '@/lib/types'

/**
 * The dashboard answers one question — what should I do today — and then shows
 * the two things that put the answer in context: the rhythm you are keeping and
 * the target you are keeping it for.
 *
 * It used to open with four counters: attempts, correct, streak and total XP.
 * The first two are review, not action, and they live on /me where reviewing is
 * the point. The other two were already on screen a hundred pixels below, inside
 * the daily goal block, so the row said nothing that was not said twice.
 *
 * The old "Start here" hero is now the same instruction the rest of the app
 * gives, from the same engine, so the dashboard cannot recommend one thing
 * while /learn recommends another.
 */
export function DashboardView({
  analytics,
  action,
  remaining,
  libraryEmpty,
  goal,
  plan,
  ready,
}: {
  analytics: ProgressAnalytics
  action: NextAction
  remaining: number
  /** Distinct from `remaining === 0`: an empty library is not an achievement. */
  libraryEmpty: boolean
  goal: Goal | null
  plan: GoalPlan | null
  ready: Readiness | null
}) {
  const hasStandings = analytics.hasData && analytics.topics.length > 0

  if (libraryEmpty) {
    return (
      <EmptyState
        icon={Library}
        title="No problems are available yet"
        body="The library has not been filled in for this workspace. Once it is, what to do next shows up here."
        action={{ href: '/sulu-ai', label: 'Ask Sulu something' }}
      />
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <NextActionCard action={action} tone="hero" />

      <div className="rise" style={riseDelay(1, 70)}>
        <DailyGoal analytics={analytics} />
      </div>

      {goal && plan && ready ? (
        <div className="rise" style={riseDelay(2, 70)}>
          <GoalProgress goal={goal} plan={plan} ready={ready} />
        </div>
      ) : null}

      {hasStandings ? (
        <section className="rise space-y-3" style={riseDelay(3, 70)}>
          <div className="flex items-end justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-primary" />
              Where you stand
            </h2>
            <Link
              href="/me"
              prefetch
              className="text-sm font-medium text-primary hover:underline"
            >
              Full analytics
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {analytics.accuracyTrend.length > 1 ? (
              <div className={cn(cardClass, 'p-5 lg:col-span-2')}>
                <p className="text-sm font-medium">Accuracy by week</p>
                <AccuracyTrendChart data={analytics.accuracyTrend} height="h-56" />
              </div>
            ) : (
              <div
                className={cn(
                  cardClass,
                  'flex items-center p-5 text-sm leading-6 text-muted-foreground lg:col-span-2',
                )}
              >
                One week of attempts so far. The trend line appears once there are two to compare.
              </div>
            )}

            {/* Mastery and the topics that need work were two cards saying the
                same thing from different ends. One list, weakest first, with the
                ones below the line marked. */}
            <div className={cn(cardClass, 'p-5')}>
              <p className="text-sm font-medium">Topic mastery</p>
              <ul className="mt-4 space-y-3.5">
                {[...analytics.topics]
                  .sort((a, b) => a.mastery - b.mastery)
                  .slice(0, 5)
                  .map((topic) => {
                    const weak = topic.mastery < 70
                    return (
                      <li key={topic.topic}>
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate">{topic.topic}</span>
                          <span
                            className={cn(
                              'shrink-0 font-semibold tabular-nums',
                              weak ? 'text-amber-500' : 'text-primary',
                            )}
                          >
                            {topic.mastery}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              'h-full rounded-full transition-[width] duration-700 ease-out',
                              weak ? 'bg-amber-500' : 'bg-primary',
                            )}
                            style={{ width: `${topic.mastery}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                {analytics.weakTopics.length
                  ? `Below 70% is where the next gain is — ${analytics.weakTopics.length} topic${analytics.weakTopics.length === 1 ? '' : 's'} to shore up.`
                  : 'Nothing below 70%. Try something harder.'}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {remaining} problem{remaining === 1 ? '' : 's'} left in the library ·{' '}
            <Link href="/tasks" prefetch className="text-primary hover:underline">
              browse them
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  )
}
