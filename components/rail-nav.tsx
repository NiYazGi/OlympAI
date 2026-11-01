import { RailLinks } from '@/components/rail-links'
import { getCurrentProfile } from '@/lib/supabase/queries'

/**
 * Reads the one thing the navigation needs from the database — which kind of
 * account this is — and nothing else. It sits in its own Suspense boundary so
 * the app shell is still in the first flush.
 */
export async function RailNav() {
  const profile = await getCurrentProfile()
  return <RailLinks role={profile?.role === 'teacher' ? 'teacher' : 'student'} />
}
