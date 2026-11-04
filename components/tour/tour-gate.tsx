import { Tour, TourButton } from '@/components/tour/tour'
import { getCurrentProfile } from '@/lib/supabase/queries'

/**
 * The tour's server half: who is asking, and whether they have seen it.
 *
 * It starts by itself only for an account that has never been shown round and
 * is done with onboarding — the tour describes the app, and the onboarding
 * screens are not the app. Teachers skip onboarding, so for them the first
 * visit to their classes is enough.
 */
export async function TourGate() {
  const profile = await getCurrentProfile()
  const role = profile?.role === 'teacher' ? 'teacher' : 'student'
  const autoStart = Boolean(
    profile &&
      !profile.tour_completed_at &&
      (role === 'teacher' || profile.onboarding_completed_at),
  )

  return (
    <>
      <TourButton role={role} />
      <Tour role={role} autoStart={autoStart} />
    </>
  )
}
