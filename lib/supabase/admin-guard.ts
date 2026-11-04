import 'server-only'

import { notFound } from 'next/navigation'
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUserId, getVerifiedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { getT } from '@/lib/i18n/server'

/**
 * Two gates, matching the two paths in lib/supabase/auth.ts.
 *
 * Pages 404 when the check fails: an admin-only page should not advertise that
 * it exists. Server actions return an error instead, and re-read the flag with
 * the service role, because what follows them is a service-role write.
 *
 * The flag itself is safe to read through the caller's own session: since
 * migration 0031 only the service role can change it.
 */

export const isCurrentUserAdmin = cache(async (): Promise<boolean> => {
  const userId = await getSessionUserId()
  if (!userId) return false
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle()
  return Boolean(data?.is_admin)
})

/** For admin pages. Returns the service-role client, or renders the 404. */
export async function requireAdminPage() {
  if (!(await isCurrentUserAdmin())) notFound()
  return createAdminClient()
}

export type AdminResult = { ok: boolean; error?: string; message?: string }

/** For admin actions. Either the verified admin and a service-role client, or why not. */
export async function requireAdminAction(): Promise<
  | { ok: true; userId: string; admin: ReturnType<typeof createAdminClient> }
  | { ok: false; error: string }
> {
  const t = await getT()
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }

  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!data?.is_admin) return { ok: false, error: t('Only an administrator can do that.') }
  return { ok: true, userId: user.id, admin }
}
