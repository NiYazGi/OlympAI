import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type RateLimitResult = { allowed: true } | { allowed: false; message: string }

const CHAT_LIMIT_PER_HOUR = 60
const ATTEMPT_LIMIT_PER_HOUR = 40

/**
 * Both model-backed features cost money per call and were previously unmetered:
 * a signed-in account could hold the send button and bill the project's OpenAI
 * key indefinitely.
 *
 * The counters read rows the caller already owns. RLS scopes both tables to the
 * current user, so the count is per-user without an explicit user_id filter and
 * no extra table is needed. In-memory counters were the alternative and would
 * not survive serverless, where every instance keeps its own private quota.
 *
 * A failed count returns null and the request is allowed: a rate limiter must
 * not turn a database hiccup into an outage.
 */
function oneHourAgo() {
  return new Date(Date.now() - 60 * 60_000).toISOString()
}

export async function checkChatRateLimit(
  supabase: SupabaseClient<Database>,
): Promise<RateLimitResult> {
  const { count, error } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user')
    .gte('created_at', oneHourAgo())

  if (error || count === null) return { allowed: true }
  if (count >= CHAT_LIMIT_PER_HOUR) {
    return {
      allowed: false,
      message: `You have reached this hour's limit of ${CHAT_LIMIT_PER_HOUR} messages to Sulu. Try again a little later.`,
    }
  }
  return { allowed: true }
}

export async function checkAttemptRateLimit(
  supabase: SupabaseClient<Database>,
): Promise<RateLimitResult> {
  const { count, error } = await supabase
    .from('task_attempts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneHourAgo())

  if (error || count === null) return { allowed: true }
  if (count >= ATTEMPT_LIMIT_PER_HOUR) {
    return {
      allowed: false,
      message: `You have reached this hour's limit of ${ATTEMPT_LIMIT_PER_HOUR} graded submissions. Try again a little later.`,
    }
  }
  return { allowed: true }
}
