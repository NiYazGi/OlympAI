import { FlameButton } from '@/components/flame/flame-button'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getFlame } from '@/lib/supabase/visits'

/**
 * The flame's server half. Students only: a teacher's app has no practice of
 * their own to keep alive, and a counter that nags them to open it daily is
 * a counter for the wrong person.
 */
export async function FlameGate() {
  const [profile, flame] = await Promise.all([getCurrentProfile(), getFlame()])
  if (!profile || profile.role === 'teacher') return null
  return <FlameButton initial={flame} />
}
