'use server'

import { getVerifiedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'

/**
 * Records that this account has been shown round, finished or skipped alike:
 * either way it should not start again by itself. Replaying it from the "?"
 * button does not need this cleared.
 */
export async function finishTour(): Promise<{ ok: boolean }> {
  const user = await getVerifiedUser()
  if (!user) return { ok: false }
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ tour_completed_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('tour_completed_at', null)
  return { ok: !error }
}
