import { Reveal } from '@/components/reveal'
import { redirect } from 'next/navigation'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { DashboardHeading } from '@/components/dashboard/dashboard-heading'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { buildPath } from '@/lib/path'
import { planForGoal, readiness } from '@/lib/goal'
import { getNextAction } from '@/lib/supabase/study'
import {
  getCurrentProfile,
  getGoal,
  getProgressAnalytics,
  getTaskCatalogue,
} from '@/lib/supabase/queries'
import { cardClass, cn } from '@/lib/utils'

export const metadata = { title: 'Dashboard' }

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
  const [profile, analytics, tasks, goal, action] = await Promise.all([
    getCurrentProfile(),
    getProgressAnalytics(),
    getTaskCatalogue(),
    getGoal(),
    getNextAction(),
  ])
  if (hasSupabaseEnv() && profile && !profile.onboarding_completed_at) redirect('/onboarding')

  // Only shown once both halves of the goal are set; the path page asks for
  // whichever is missing.
  const hasGoal = Boolean(goal.subjectName && goal.targetDate)
  const path = hasGoal ? buildPath(tasks, goal.subjectName) : null
  const attemptsLastWeek = analytics.recentActivity.reduce((sum, day) => sum + day.problems, 0)

  return (
    <DashboardView
      analytics={analytics}
      action={action}
      remaining={tasks.filter((task) => !task.solved).length}
      libraryEmpty={tasks.length === 0}
      goal={hasGoal ? goal : null}
      plan={path ? planForGoal(path, goal.targetDate!, attemptsLastWeek) : null}
      ready={path ? readiness(path, analytics.hasData ? analytics.accuracy : null) : null}
    />
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PendingRegion label="Loading your dashboard" />
      <BlockSkeleton className={cn(cardClass, 'h-52')} />
      <BlockSkeleton className={cn(cardClass, 'h-44')} />
      <div className="grid gap-4 lg:grid-cols-3">
        <BlockSkeleton className={cn(cardClass, 'h-64 lg:col-span-2')} />
        <BlockSkeleton className={cn(cardClass, 'h-64')} />
      </div>
    </div>
  )
}
