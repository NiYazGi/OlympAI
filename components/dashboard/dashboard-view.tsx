import Link from 'next/link'
import { Library } from 'lucide-react'
import { DayCard } from '@/components/day/day-card'
import { GoalProgress } from '@/components/dashboard/goal-progress'
import { StatStrip } from '@/components/dashboard/stat-strip'
import { NextActionCard } from '@/components/learn/next-action-card'
import { AccuracyTrendChart } from '@/components/charts'
import { EmptyState } from '@/components/empty-state'
import { Meter } from '@/components/meter'
import { getT } from '@/lib/i18n'
import { cardClass, cn, labelClass } from '@/lib/utils'
import type { GoalPlan, Readiness } from '@/lib/goal'
import type { NextAction } from '@/lib/next-action'
import type { DayStatus } from '@/lib/supabase/day'
import type { SkillShape } from '@/lib/supabase/study'
import type { Goal, ProgressAnalytics } from '@/lib/types'

/**
 * The dashboard, from the nearest question outwards: what to do now, the four
 * numbers behind it, how today is going, how the subject is going, how the
 * target is going.
 *
 * It used to open with four counters and then explain each of them. The
 * explanations are on /method now. A dashboard is read every day by somebody
 * who read it yesterday, and a sentence that was useful once is furniture by
 * the fourth reading.
 */
export async function DashboardView({
  analytics,
  action,
  libraryEmpty,
  goal,
  plan,
  ready,
  day,
  skills,
  university,
}: {
  analytics: ProgressAnalytics
  action: NextAction
  /** Distinct from "nothing left to do": an empty library is not an achievement. */
  libraryEmpty: boolean
  goal: Goal | null
  plan: GoalPlan | null
  ready: Readiness | null
  day: DayStatus
  skills: SkillShape
  university: string | null
}) {
  const t = await getT()

  if (libraryEmpty) {
    return (
      <EmptyState
        icon={Library}
        title={t.dashboard.emptyTitle}
        body={t.dashboard.emptyBody}
        action={{ href: '/sulu-ai', label: t.dashboard.emptyAction }}
      />
    )
  }

  const hasShape = skills.topics.length > 0
  const hasTrend = analytics.accuracyTrend.length > 1

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* The data-tour wrappers are where the guided tour points: see
          components/tour. They carry no style of their own. */}
      <div data-tour="today">
        <NextActionCard action={action} tone="hero" />
      </div>

      <div data-tour="stats">
        <StatStrip
          analytics={analytics}
          target={
            goal && plan
              ? { name: goal.competition?.name ?? goal.subjectName ?? '', daysLeft: plan.daysLeft }
              : null
          }
        />
      </div>

      <div data-tour="day">
        <DayCard status={day} />
      </div>

      {hasShape ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className={labelClass}>{t.dashboard.whereYouStand}</h2>
            <Link href="/me" prefetch className="text-sm font-medium text-primary hover:underline">
              {t.dashboard.fullAnalytics}
            </Link>
          </div>

          <div className={cn('grid gap-3', hasTrend && 'lg:grid-cols-5')}>
            {/* The shape of the subject, in one figure. Where the outline
                caves in is where the next session goes — a row of bars says
                the same thing one topic at a time, and nobody reads the row.
                Under three topics there is no shape to draw, so the bars are
                what is shown instead. */}
            <div className={cn(cardClass, 'p-5', hasTrend && 'lg:col-span-2')}>
              <p className={labelClass}>{t.dashboard.skills}</p>
              {/* Bars, weakest first, rather than a radar: a radar's outline
                  is only readable once every spoke has data, and the first
                  thing a student reads should be the weakest topic by name. */}
              {(
                <ul className="mt-4 space-y-3.5">
                  {[...skills.topics]
                    .sort((a, b) => a.mastery - b.mastery)
                    .map((topic) => (
                      <li key={topic.topic}>
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate">{topic.topic}</span>
                          <span className="shrink-0 font-semibold tabular-nums">{topic.mastery}%</span>
                        </div>
                        <Meter value={topic.mastery} className="mt-1.5" />
                      </li>
                    ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {skills.weak.length
                  ? t.dashboard.weakest(skills.weak.slice(0, 3).join(', '))
                  : t.dashboard.nothingWeak}
              </p>
            </div>

            {hasTrend ? (
              <div className={cn(cardClass, 'p-5 lg:col-span-3')}>
                <p className={labelClass}>{t.dashboard.accuracyByWeek}</p>
                <AccuracyTrendChart data={analytics.accuracyTrend} height="h-60" />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {goal && plan && ready ? (
        <GoalProgress
          goal={goal}
          plan={plan}
          ready={ready}
          phase={day.score.phase}
          university={university}
        />
      ) : null}
    </div>
  )
}
