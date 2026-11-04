import 'server-only'

import { getDb } from '@/lib/db'

/**
 * Account operations the admin panel needs and the Supabase-shaped client does
 * not offer: auth.users is not in the public schema, so these go to the
 * database directly. Every caller has already passed requireAdminAction or
 * requireAdminPage.
 */

export type AccountRow = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  banned_at: string | null
  ban_reason: string | null
  full_name: string | null
  username: string | null
  grade: string | null
  primary_subject: string | null
  role: string
  is_admin: boolean
  onboarding_completed_at: string | null
  attempts: number
  avg_score: number | null
  last_visit: string | null
  visits_30d: number
  sessions: number
}

const SELECT = `
  select u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at, u.banned_at, u.ban_reason,
         p.full_name, p.username, p.grade, p.primary_subject, coalesce(p.role, 'student') as role,
         coalesce(p.is_admin, false) as is_admin, p.onboarding_completed_at,
         coalesce(a.attempts, 0)::int as attempts, a.avg_score,
         v.last_visit, coalesce(v.visits_30d, 0)::int as visits_30d,
         coalesce(s.sessions, 0)::int as sessions
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join (
      select user_id, count(*) as attempts, round(avg(score))::int as avg_score
        from public.task_attempts group by user_id
    ) a on a.user_id = u.id
    left join (
      select user_id, max(day)::text as last_visit,
             count(*) filter (where day >= current_date - 30) as visits_30d
        from public.daily_visits group by user_id
    ) v on v.user_id = u.id
    left join (
      select user_id, count(*) as sessions from auth.sessions where expires_at > now() group by user_id
    ) s on s.user_id = u.id`

export async function listAccounts(): Promise<AccountRow[]> {
  const db = await getDb()
  const { rows } = await db.query<AccountRow>(`${SELECT} order by u.created_at desc`)
  return rows.map(normalise)
}

export async function getAccount(id: string): Promise<AccountRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const db = await getDb()
  const { rows } = await db.query<AccountRow>(`${SELECT} where u.id = $1`, [id])
  return rows[0] ? normalise(rows[0]) : null
}

/** PGlite hands timestamps back as Date objects; the pages expect strings. */
function normalise(row: AccountRow): AccountRow {
  const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : (value as string | null))
  return {
    ...row,
    created_at: iso(row.created_at)!,
    last_sign_in_at: iso(row.last_sign_in_at),
    email_confirmed_at: iso(row.email_confirmed_at),
    banned_at: iso(row.banned_at),
    onboarding_completed_at: iso(row.onboarding_completed_at),
  }
}

export async function confirmEmail(id: string) {
  const db = await getDb()
  const { affectedRows } = await db.query(
    'update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1',
    [id],
  )
  return Boolean(affectedRows)
}

/** Blocks the account and ends every session it has, so it is out at once. */
export async function blockAccount(id: string, reason: string | null) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const { affectedRows } = await tx.query('update auth.users set banned_at = now(), ban_reason = $2 where id = $1', [
      id,
      reason,
    ])
    await tx.query('delete from auth.sessions where user_id = $1', [id])
    return Boolean(affectedRows)
  })
}

export async function unblockAccount(id: string) {
  const db = await getDb()
  const { affectedRows } = await db.query('update auth.users set banned_at = null, ban_reason = null where id = $1', [id])
  return Boolean(affectedRows)
}

export async function endSessions(id: string) {
  const db = await getDb()
  const { affectedRows } = await db.query('delete from auth.sessions where user_id = $1', [id])
  return affectedRows ?? 0
}

/**
 * Deletes the account and, through the foreign keys, everything it owns:
 * profile, attempts, chats, classes. Returns the ids of the classes it taught,
 * so their files on disk can be removed too.
 */
export async function deleteAccount(id: string) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<{ id: string }>('select id from public.classes where teacher_id = $1', [id])
    // competitions.created_by cascades (migration 0012): an admin who added
    // the catalogue would take every olympiad with them. Keep the olympiads.
    await tx.query('update public.competitions set created_by = null where created_by = $1', [id])
    const { affectedRows } = await tx.query('delete from auth.users where id = $1', [id])
    return { deleted: Boolean(affectedRows), classIds: rows.map((row) => row.id) }
  })
}

/** Signs-ups per day for the last `days` days, oldest first, zeros included. */
export async function signupsByDay(days: number) {
  const db = await getDb()
  const { rows } = await db.query<{ day: string; signups: number; visitors: number }>(
    `with days as (
       select generate_series(current_date - ($1::int - 1), current_date, interval '1 day')::date as day
     )
     select d.day::text as day,
            (select count(*) from auth.users u where u.created_at::date = d.day)::int as signups,
            (select count(*) from public.daily_visits v where v.day = d.day)::int as visitors
       from days d order by d.day`,
    [days],
  )
  return rows
}
