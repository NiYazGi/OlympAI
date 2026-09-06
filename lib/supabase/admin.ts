import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { getSupabaseSecretKey } from '@/lib/supabase/secret-env'

/**
 * Service-role client. It bypasses RLS, so it must never be handed a user id
 * that did not come from a verified `supabase.auth.getUser()` call on the
 * server.
 *
 * It exists for exactly one reason: `task_attempts` carries the grade, and a
 * grade the browser can write is not a grade. RLS therefore grants
 * `authenticated` no insert on that table, and the graded row is written here
 * instead — after the grader has run.
 */
export function createAdminClient() {
  const { supabaseUrl } = getSupabaseEnv()

  return createSupabaseClient<Database>(supabaseUrl, getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
