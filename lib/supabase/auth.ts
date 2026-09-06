import 'server-only'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseEnv } from '@/lib/supabase/env'

/**
 * Two ways to establish who is calling, with different costs and guarantees.
 *
 * `getUser()` POSTs to Supabase Auth on every call — measured at 0.5-1.3 s
 * against this project. It was being called about eight times per dashboard
 * render, once in the proxy and again in every query helper.
 *
 * `getClaims()` verifies the JWT signature locally against the project's JWKS
 * (this project signs with asymmetric ES256, so the public keys are fetchable
 * and cacheable). No round trip after the first key fetch.
 *
 * The split:
 *  - Reads and route gating use the claims. Row access is enforced by RLS from
 *    the same JWT regardless, so a stale claim cannot widen what is returned.
 *  - Writes that carry authority — grading an attempt with the service role —
 *    keep `getUser()`, because there the id is used to bypass RLS and a token
 *    revoked seconds ago must not still work.
 *
 * Both are wrapped in `cache()`, which dedupes within one render pass: the
 * layout and the page it wraps now share a single call instead of repeating it.
 */

/** Fast path: local signature check. Returns the user id, or null. */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  if (!hasSupabaseEnv()) return null
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null
  return data.claims.sub
})

/** Authoritative path: asks the auth server. Use before privileged writes. */
export const getVerifiedUser = cache(async () => {
  if (!hasSupabaseEnv()) return null
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
