import { Library } from 'lucide-react'
import { XpProgress } from '@/components/dashboard/xp-progress'
import { NextActionCard } from '@/components/learn/next-action-card'
import { EmptyState } from '@/components/empty-state'
import { PreparationRoadmap } from '@/components/preparation/roadmap'
import type { getPreparation } from '@/lib/supabase/preparation'
import type { NextAction } from '@/lib/next-action'
import type { ProgressAnalytics } from '@/lib/types'
import { getT } from '@/lib/i18n/server'

export async function DashboardView({
  analytics,
  action,
  libraryEmpty,
  preparation,
}: {
  analytics: ProgressAnalytics
  action: NextAction
  /** Distinct from nothing left to solve: an empty library is not an achievement. */
  libraryEmpty: boolean
  preparation: Awaited<ReturnType<typeof getPreparation>>
}) {
  const t = await getT()

  if (libraryEmpty && !preparation) {
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
        {preparation ? (
          <PreparationRoadmap
            key={preparation.mockPrefix}
            plan={preparation.plan} name={preparation.name} subject={preparation.subject}
            targetDate={preparation.targetDate} competitionSlug={preparation.competitionSlug} mockPrefix={preparation.mockPrefix}
          />
        ) : <NextActionCard action={action} tone="hero" />}
      </div>

      <XpProgress xp={analytics.xp} hasPreparation={Boolean(preparation)} />
    </div>
  )
}
