import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { getDb } from '@/lib/db'
import { ACTION_LABEL } from '@/lib/admin/log'
import { ago } from '@/lib/admin/format'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Activity log · Admin') }
}

type Row = { id: number; action: string; target: string | null; detail: Record<string, unknown>; created_at: string; admin_id: string | null; admin: string | null }

const UUID = /^[0-9a-f-]{36}$/i

/** Where a target id leads, by what kind of action it was. */
function targetHref(action: string, target: string | null) {
  if (!target) return null
  if (action.startsWith('user.') || action.startsWith('admin.')) return `/admin/users/${target}`
  if (action.startsWith('task.')) return action === 'task.delete' ? null : `/admin/tasks/${target}`
  if (action.startsWith('ai.')) return '/admin/ai'
  if (action.startsWith('card.')) return `/admin/tasks/${target}#card`
  if (action.startsWith('olympiad.')) return '/admin/olympiads'
  if (action.startsWith('report.')) return '/admin/reports'
  if (action.startsWith('class.')) return '/admin/classes'
  return null
}

function describe(detail: Record<string, unknown>) {
  return Object.entries(detail)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'string' && UUID.test(value) ? value.slice(0, 8) : String(value)}`)
    .join(' · ')
}

/** Every change made from this panel, newest first, and who made it. */
export default async function AdminLogPage({ searchParams }: { searchParams: Promise<{ admin?: string }> }) {
  const [t, locale] = await Promise.all([getT(), getLocale()])
  await requireAdminPage()
  const { admin: adminFilter } = await searchParams
  const db = await getDb()
  const values = adminFilter && UUID.test(adminFilter) ? [adminFilter] : []
  const { rows } = await db.query<Row>(
    `select l.id, l.action, l.target, l.detail, l.created_at, l.admin_id, coalesce(p.full_name, u.email) as admin
       from public.admin_log l
       left join auth.users u on u.id = l.admin_id
       left join public.profiles p on p.id = l.admin_id
      ${values.length ? 'where l.admin_id = $1' : ''}
      order by l.created_at desc limit 300`,
    values,
  )

  return (
    <>
      <PageHeader
        title={t('Activity log')}
        description={t('Every change made from the admin panel and who made it. Kept so a second admin can see what happened.')}
        note={
          adminFilter ? (
            <Link href="/admin/log" className="text-xs text-ash hover:text-foreground">
              {t('Show every admin')}
            </Link>
          ) : null
        }
      />
      <div className={cn(cardClass, 'overflow-hidden')}>
        {rows.length ? (
          <ul className="divide-y divide-foreground/[0.04]">
            {rows.map((row) => {
              const href = targetHref(row.action, row.target)
              const text = describe(row.detail ?? {})
              return (
                <li key={row.id} className="flex items-start gap-4 px-5 py-3">
                  <span className="w-24 shrink-0 font-mono text-[11px] text-smoke">{ago(row.created_at, t, locale)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      {t(ACTION_LABEL[row.action] ?? row.action)}
                      {href ? (
                        <Link href={href} className="ml-2 font-mono text-[11px] text-ash hover:text-foreground">
                          {row.target && UUID.test(row.target) ? row.target.slice(0, 8) : row.target}
                        </Link>
                      ) : null}
                    </p>
                    {text ? <p className="mt-0.5 truncate font-mono text-[11px] text-smoke">{text}</p> : null}
                  </div>
                  {row.admin_id ? (
                    <Link href={`/admin/log?admin=${row.admin_id}`} className="shrink-0 text-xs text-ash hover:text-foreground">
                      {row.admin}
                    </Link>
                  ) : (
                    <span className="shrink-0 text-xs text-smoke">—</span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="p-6 text-sm text-ash">{t('Nothing has been changed from the panel yet.')}</p>
        )}
      </div>
    </>
  )
}
