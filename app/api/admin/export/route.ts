import { isCurrentUserAdmin } from '@/lib/supabase/admin-guard'
import { listAccounts } from '@/lib/admin/accounts'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** One CSV cell: quoted, inner quotes doubled, formula prefixes defused for spreadsheets. */
function cell(value: unknown) {
  if (value === null || value === undefined) return ''
  let text = value instanceof Date ? value.toISOString() : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

function csv(header: string[], rows: unknown[][]) {
  // The BOM makes Excel read the Cyrillic as UTF-8.
  return '﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')
}

/**
 * Users or attempts as a spreadsheet, for the admin panel's export buttons.
 * 404 for anyone who is not an admin, like the pages.
 */
export async function GET(request: Request) {
  if (!(await isCurrentUserAdmin())) return new Response('Not found', { status: 404 })
  const url = new URL(request.url)
  const what = url.searchParams.get('what')
  const stamp = new Date().toISOString().slice(0, 10)

  let body: string
  if (what === 'users') {
    const accounts = await listAccounts()
    body = csv(
      ['id', 'email', 'name', 'username', 'role', 'admin', 'grade', 'subject', 'joined', 'email_confirmed', 'blocked', 'onboarded', 'attempts', 'avg_score', 'last_visit', 'days_active_30d'],
      accounts.map((row) => [
        row.id,
        row.email,
        row.full_name,
        row.username,
        row.role,
        row.is_admin ? 'yes' : 'no',
        row.grade,
        row.primary_subject,
        row.created_at,
        row.email_confirmed_at ? 'yes' : 'no',
        row.banned_at ? 'yes' : 'no',
        row.onboarding_completed_at ? 'yes' : 'no',
        row.attempts,
        row.avg_score,
        row.last_visit,
        row.visits_30d,
      ]),
    )
  } else if (what === 'attempts') {
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 30))
    const db = await getDb()
    const { rows } = await db.query<Record<string, unknown>>(
      `select a.created_at, u.email, p.full_name, a.task_id, t.title, a.score, a.points, a.is_correct, a.graded_by, a.source
         from public.task_attempts a
         join auth.users u on u.id = a.user_id
         left join public.profiles p on p.id = a.user_id
         left join public.tasks t on t.id = a.task_id
        where a.created_at > now() - make_interval(days => $1)
        order by a.created_at desc`,
      [days],
    )
    body = csv(
      ['created_at', 'email', 'name', 'task_id', 'task', 'score', 'points_of_7', 'correct', 'graded_by', 'source'],
      rows.map((row) => [row.created_at, row.email, row.full_name, row.task_id, row.title, row.score, row.points, row.is_correct ? 'yes' : 'no', row.graded_by, row.source]),
    )
  } else {
    return new Response('Unknown export', { status: 400 })
  }

  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="olympai-${what}-${stamp}.csv"`,
      'cache-control': 'no-store',
    },
  })
}
