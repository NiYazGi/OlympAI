import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { Database } from '@/lib/supabase/database.types'
import { getSupabaseEnv } from '@/lib/supabase/env'

/**
 * One client per request. Without `cache()` every helper built its own, each
 * re-reading cookies and keeping its own auth state, so nothing could be shared
 * or deduplicated between them.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies()
  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv()

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Server Components cannot write cookies. The proxy refreshes them.
        }
      },
    },
  })
})