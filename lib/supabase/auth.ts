import 'server-only'

import { cache } from 'react'
import { getSessionUser } from '@/lib/db/auth'

/**
 * Who is calling. Both read the session from the local database — one indexed
 * lookup in-process, deduplicated per render by `cache()`.
 *
 * They used to differ: getClaims() checked a JWT locally while getUser() asked
 * Supabase Auth over the network (0.5-1.3 s). With sessions stored next to the
 * data there is no cheaper, weaker path left, so a revoked session is refused
 * immediately by both. The two names stay so callers still say which guarantee
 * they rely on.
 */

/** The signed-in user's id, or null. */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  return (await getSessionUser())?.id ?? null
})

/** The signed-in user, checked against the session table. Use before privileged writes. */
export const getVerifiedUser = cache(async () => getSessionUser())
