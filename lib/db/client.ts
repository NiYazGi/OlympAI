import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { localAuth } from '@/lib/db/auth'
import { QueryBuilder, runAs, type DbContext, type DbResult } from '@/lib/db/query'

const NAME = /^[a-z_][a-z0-9_]*$/

/**
 * `supabase.rpc(name, args)`: a call to a function in the public schema, by
 * named arguments, as the caller's role — so a security-invoker function is
 * held to the same policies as the queries around it. Objects and arrays go in
 * as JSON, which is what every jsonb parameter here takes.
 */
async function rpc(context: DbContext, name: string, args: Record<string, unknown> = {}): Promise<DbResult> {
  if (!NAME.test(name)) throw new Error(`Unsupported function: ${name}`)
  const keys = Object.keys(args)
  for (const key of keys) if (!NAME.test(key)) throw new Error(`Unsupported argument: ${key}`)
  const values = keys.map((key) => {
    const value = args[key]
    return value !== null && typeof value === 'object' ? JSON.stringify(value) : value
  })
  const call = `public."${name}"(${keys.map((key, i) => `"${key}" => $${i + 1}`).join(', ')})`
  try {
    const rows = await runAs(context, async (tx) => (await tx.query<Record<string, unknown>>(`select * from ${call}`, values)).rows)
    // A void function comes back as one row holding an empty value.
    const single = rows.length === 1 ? Object.values(rows[0]!) : null
    const data = single && single.length === 1 && (single[0] === '' || single[0] === null) ? null : rows
    return { data, error: null, count: null, status: 200 }
  } catch (cause) {
    const error = cause as { message?: string; code?: string; detail?: string; hint?: string }
    return {
      data: null,
      error: {
        message: error.message ?? String(cause),
        code: error.code ?? 'LOCAL',
        details: error.detail ?? null,
        hint: error.hint ?? null,
      },
      count: null,
      status: 400,
    }
  }
}

/**
 * A client with the Supabase surface the app uses — `from()`, `rpc()` and `auth` —
 * backed by the embedded database. Typed as a SupabaseClient so the generated
 * Database types keep checking every query in the app.
 */
export type DbClient = SupabaseClient<Database>

export function createDbClient(context: DbContext): DbClient {
  const client = {
    from: (table: string) => new QueryBuilder(context, table),
    rpc: (name: string, args?: Record<string, unknown>) => rpc(context, name, args),
    auth: localAuth,
  }
  return client as unknown as DbClient
}
