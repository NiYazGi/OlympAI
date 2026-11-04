import { Reveal } from '@/components/reveal'
import { redirect } from 'next/navigation'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { DashboardHeading } from '@/components/dashboard/dashboard-heading'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { buildPath } from '@/lib/path'
import { planForGoal, readiness } from '@/lib/goal'
import { getDayStatus } from '@/lib/supabase/day'
import { getStudentTrack } from '@/lib/supabase/track'
import { getNextAction } from '@/lib/supabase/study'
import {
  getCurrentProfile,
  getGoal,
  getProgressAnalytics,
  getTaskCatalogue,
} from '@/lib/supabase/queries'
import { cardClass, cn } from '@/lib/utils'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Dashboard') }
}

/**
 * The heading paints from the first flush; everything that needs Supabase sits
 * behind one Suspense boundary. The page used to await the profile, the
 * analytics and the catalogue before rendering a single element.
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:space-y-8 sm:p-8">
      <DashboardHeading />
      <Reveal fallback={<DashboardSkeleton />}>
        <DashboardData />
      </Reveal>
    </div>
  )
}

async function DashboardData() {
  const [profile, analytics, tasks, goal, action, day, track] = await Promise.all([
    getCurrentProfile(),
    getProgressAnalytics(),
    getTaskCatalogue(),
    getGoal(),
    getNextAction(),
    getDayStatus(),
    getStudentTrack(),
  ])
  if (profile && !profile.onboarding_completed_at) redirect('/onboarding')
  // A teacher's home is their classes: everything on this page is somebody's
  // own practice, and a teacher has none of it.
  if (profile?.role === 'teacher') redirect('/class')

  // Only shown once both halves of the goal are set; the path page asks for
  // whichever is missing.
  const hasGoal = Boolean(goal.subjectName && goal.targetDate)
  const path = hasGoal ? buildPath(tasks, goal.subjectName, track.track) : null
  const attemptsLastWeek = analytics.recentActivity.reduce((sum, entry) => sum + entry.problems, 0)

  return (
    <DashboardView
      analytics={analytics}
      action={action}
      libraryEmpty={tasks.length === 0}
      goal={hasGoal ? goal : null}
      plan={path ? planForGoal(path, goal.targetDate!, attemptsLastWeek, profile?.training_intensity ?? null, goal.goalSetAt) : null}
      ready={path ? readiness(path, analytics.totalAttempts > 0 ? analytics.accuracy : null) : null}
      day={day}
    />
  )
}

async function DashboardSkeleton() {
  const t = await getT()

  return (
    <div className="space-y-6 sm:space-y-8">
      <PendingRegion label={t('Loading your dashboard')} />
      <BlockSkeleton className={cn(cardClass, 'h-52')} />
      <BlockSkeleton className={cn(cardClass, 'h-14')} />
      <BlockSkeleton className={cn(cardClass, 'h-12')} />
    </div>
  )
}
