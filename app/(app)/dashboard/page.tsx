import { Reveal } from '@/components/reveal'
import { redirect } from 'next/navigation'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { DashboardHeading } from '@/components/dashboard/dashboard-heading'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { buildPath } from '@/lib/path'
import { planForGoal, readiness } from '@/lib/goal'
import { getNextAction, getSkillShape } from '@/lib/supabase/study'
import { getDayStatus } from '@/lib/supabase/day'
import {
  getCurrentProfile,
  getGoal,
  getProgressAnalytics,
  getTaskCatalogue,
} from '@/lib/supabase/queries'
import { getStudentTrack } from '@/lib/supabase/track'
import { getT } from '@/lib/i18n'
import { cardClass, cn } from '@/lib/utils'

export const metadata = { title: 'Dashboard' }

/**
 * The heading paints from the first flush; everything that needs Supabase sits
 * behind one Suspense boundary. The page used to await the profile, the
 * analytics and the catalogue before rendering a single element.
 */
export default async function DashboardPage() {
  const t = await getT()

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:space-y-8 sm:p-8">
      <DashboardHeading />
      <Reveal fallback={<DashboardSkeleton label={t.dashboard.loading} />}>
        <DashboardData />
      </Reveal>
    </div>
  )
}

async function DashboardData() {
  const [profile, analytics, tasks, goal, action, day, skills, track] = await Promise.all([
    getCurrentProfile(),
    getProgressAnalytics(),
    getTaskCatalogue(),
    getGoal(),
    getNextAction(),
    getDayStatus(),
    getSkillShape(),
    getStudentTrack(),
  ])
  if (hasSupabaseEnv() && profile && !profile.onboarding_completed_at) redirect('/onboarding')
  // A teacher's home is their classes. Everything below this line is somebody's
  // own practice — their XP, their streak, their next problem — and a teacher
  // has none of it. The wordmark in the header points here from every page, so
  // the redirect lives on the page rather than only in the navigation.
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
      plan={
        path
          ? planForGoal(path, goal.targetDate!, attemptsLastWeek, profile?.training_intensity ?? null)
          : null
      }
      ready={path ? readiness(path, analytics.totalAttempts > 0 ? analytics.accuracy : null) : null}
      day={day}
      skills={skills}
      university={profile?.target_university ?? null}
    />
  )
}

function DashboardSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PendingRegion label={label} />
      <BlockSkeleton className={cn(cardClass, 'h-48')} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <BlockSkeleton key={index} className={cn(cardClass, 'h-24')} />
        ))}
      </div>
      <BlockSkeleton className={cn(cardClass, 'h-80')} />
    </div>
  )
}
