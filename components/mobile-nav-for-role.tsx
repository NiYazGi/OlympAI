import { MobileNav } from '@/components/mobile-nav'
import { getCurrentProfile } from '@/lib/supabase/queries'

/** The phone's tab bar, once the role is known. See components/rail-nav.tsx. */
export async function MobileNavForRole() {
  const profile = await getCurrentProfile()
  return <MobileNav role={profile?.role === 'teacher' ? 'teacher' : 'student'} />
}
