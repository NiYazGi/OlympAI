import { ChevronDown, Library } from 'lucide-react'
import { DayCard } from '@/components/day/day-card'
import type { DayStatus } from '@/lib/supabase/day'
import { StatusStrip } from '@/components/dashboard/status-strip'
import { NextActionCard } from '@/components/learn/next-action-card'
import { EmptyState } from '@/components/empty-state'
import { DAY_MAX } from '@/lib/day-state'
import { cardClass, cn } from '@/lib/utils'
import type { GoalPlan, Readiness } from '@/lib/goal'
import type { NextAction } from '@/lib/next-action'
import type { Goal, ProgressAnalytics } from '@/lib/types'
import { getT } from '@/lib/i18n/server'

/**
 * The dashboard answers one question — what should I do today — and stops.
 *
 * Three blocks: the one step to take, a single line of status under it, and
 * the day check-in folded away until it is wanted. It used to carry eight —
 * an XP ring, a goal ring, the five-axis day card open, an accuracy chart,
 * topic mastery bars and a library count — every one a reasonable card, all
 * of the same weight, so the eye had nowhere to go after the first. The
 * charts and the topic list are on Progress (/me), where reviewing is the
 * point.
 */
export async function DashboardView({
  analytics,
  action,
  libraryEmpty,
  goal,
  plan,
  ready,
  day,
}: {
  analytics: ProgressAnalytics
  action: NextAction
  /** Distinct from nothing left to solve: an empty library is not an achievement. */
  libraryEmpty: boolean
  goal: Goal | null
  plan: GoalPlan | null
  ready: Readiness | null
  /** The day's five axes, scored. */
  day: DayStatus
}) {
  const t = await getT()

  if (libraryEmpty) {
    return (
      <EmptyState
        icon={Library}
        title={t('No problems are available yet')}
        body={t('The library has not been filled in for this workspace. Once it is, what to do next shows up here.')}
        action={{ href: '/sulu-ai', label: t('Ask Sulu something') }}
      />
    )
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* The data-tour wrappers are where the guided tour points. */}
      <div data-tour="today">
        <NextActionCard action={action} tone="hero" />
      </div>

      <div data-tour="stats">
        <StatusStrip analytics={analytics} goal={goal} plan={plan} ready={ready} />
      </div>

      {/* Folded: a once-a-day form does not need the screen the rest of the
          day. The summary says whether it has been filled in. */}
      <details data-tour="day" className={cn(cardClass, 'group')}>
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm sm:px-5 [&::-webkit-details-marker]:hidden">
          <span className="font-medium">{t('How the day went')}</span>
          <span className="text-muted-foreground">
            {day.recorded
              ? t('{n} of {max} points', { n: day.score.total, max: DAY_MAX })
              : t('not filled in yet')}
          </span>
          <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border/60 [&>section]:rounded-none [&>section]:bg-transparent [&>section]:shadow-none">
          <DayCard status={day} />
        </div>
      </details>
    </div>
  )
}
