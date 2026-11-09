import { Reveal } from '@/components/reveal'
import { redirect } from 'next/navigation'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { getPreparation } from '@/lib/supabase/preparation'
import { getNextAction } from '@/lib/supabase/study'
import {
  getCurrentProfile,
  getProgressAnalytics,
  getTaskCatalogue,
} from '@/lib/supabase/queries'
import { cardClass, cn } from '@/lib/utils'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Dashboard') }
}

export default async function DashboardPage() {
  const t = await getT()

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-3 pb-4 sm:px-8 sm:pt-2 sm:pb-5">
      <h1 className="sr-only">{t('Dashboard')}</h1>
      <Reveal fallback={<DashboardSkeleton />}>
        <DashboardData />
      </Reveal>
    </div>
  )
}

async function DashboardData() {
  const [profile, analytics, tasks, action, preparation] = await Promise.all([
    getCurrentProfile(),
    getProgressAnalytics(),
    getTaskCatalogue(),
    getNextAction(),
    getPreparation(),
  ])
  if (profile && !profile.onboarding_completed_at) redirect('/onboarding')
  // A teacher's home is their classes: everything on this page is somebody's
  // own practice, and a teacher has none of it.
  if (profile?.role === 'teacher') redirect('/class')

  return (
    <DashboardView
      analytics={analytics}
      action={action}
      libraryEmpty={tasks.length === 0}
      preparation={preparation}
    />
  )
}

async function DashboardSkeleton() {
  const t = await getT()

  return (
    <div className="space-y-6 sm:space-y-8">
      <PendingRegion label={t('Loading your dashboard')} />
      <BlockSkeleton className={cn(cardClass, 'h-52')} />
      <BlockSkeleton className="h-2" />
    </div>
  )
}
