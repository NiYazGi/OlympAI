import 'server-only'

import { createDbClient } from '@/lib/db/client'

/**
 * Service-role client. It bypasses RLS, so it must never be handed a user id
 * that did not come from a verified session on the server.
 *
 * It exists for exactly one reason: `task_attempts` carries the grade, and a
 * grade the browser can write is not a grade. RLS therefore grants
 * `authenticated` no insert on that table, and the graded row is written here
 * instead — after the grader has run.
 */
export function createAdminClient() {
  return createDbClient({ role: 'service_role', userId: null })
}
