import 'server-only'

import { cache } from 'react'
import { getSessionUser } from '@/lib/db/auth'
import { createDbClient } from '@/lib/db/client'

/**
 * The caller's client: `authenticated` with their id when signed in, `anon`
 * otherwise. RLS sees exactly what it saw under Supabase. One per request.
 */
export const createClient = cache(async () => {
  const user = await getSessionUser()
  return createDbClient(user ? { role: 'authenticated', userId: user.id } : { role: 'anon', userId: null })
})
