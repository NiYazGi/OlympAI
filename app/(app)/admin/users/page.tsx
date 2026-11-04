import Link from 'next/link'
import { Download, Search } from 'lucide-react'
import { AdminToggle } from '@/components/admin/admin-toggle'
import { PageHeader } from '@/components/page-header'
import { getSessionUserId } from '@/lib/supabase/auth'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { cardClass, cn, fieldClass, initials } from '@/lib/utils'
import { getLocale, getT } from '@/lib/i18n/server'
import { listAccounts, type AccountRow } from '@/lib/admin/accounts'
import { ago, displayName, shortDate } from '@/lib/admin/format'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Users · Admin') }
}

const PAGE = 100

const FILTERS: Record<string, { label: string; test: (row: AccountRow) => boolean }> = {
  all: { label: 'Everyone', test: () => true },
  students: { label: 'Students', test: (row) => row.role !== 'teacher' },
  teachers: { label: 'Teachers', test: (row) => row.role === 'teacher' },
  admins: { label: 'Admins', test: (row) => row.is_admin },
  new: { label: 'Not onboarded', test: (row) => !row.onboarding_completed_at },
  unconfirmed: { label: 'Unconfirmed', test: (row) => !row.email_confirmed_at },
  blocked: { label: 'Blocked', test: (row) => Boolean(row.banned_at) },
}

const SORTS: Record<string, { label: string; compare: (a: AccountRow, b: AccountRow) => number }> = {
  newest: { label: 'Newest', compare: (a, b) => b.created_at.localeCompare(a.created_at) },
  active: { label: 'Last visit', compare: (a, b) => (b.last_visit ?? '').localeCompare(a.last_visit ?? '') },
  attempts: { label: 'Most attempts', compare: (a, b) => b.attempts - a.attempts },
  name: { label: 'Name', compare: (a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email) },
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; sort?: string; page?: string; deleted?: string }>
}) {
  const t = await getT()
  const locale = await getLocale()
  await requireAdminPage()
  const params = await searchParams
  const q = params.q ?? ''
  const filter = params.filter && FILTERS[params.filter] ? params.filter : 'all'
  const sort = params.sort && SORTS[params.sort] ? params.sort : 'newest'
  const page = Math.max(1, Number(params.page) || 1)
  const me = await getSessionUserId()

  const all = await listAccounts()
  const needle = q.trim().toLowerCase()
  const rows = all
    .filter(FILTERS[filter]!.test)
    .filter((row) =>
      needle ? [row.full_name, row.username, row.email, row.id].some((value) => value?.toLowerCase().includes(needle)) : true,
    )
    .sort(SORTS[sort]!.compare)
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const shown = rows.slice((page - 1) * PAGE, page * PAGE)

  const query = (patch: Record<string, string | undefined>) => {
    const next = { q: q || undefined, filter: filter === 'all' ? undefined : filter, sort: sort === 'newest' ? undefined : sort, ...patch }
    return { pathname: '/admin/users', query: Object.fromEntries(Object.entries(next).filter(([, value]) => value)) }
  }

  return (
    <>
      <PageHeader
        title={t('Users')}
        description={t('Every account. Open one to change its role, confirm it, block it or delete it.')}
        note={<p className="font-mono text-[11px] text-smoke">{t('{n} of {m} shown', { n: rows.length, m: all.length })}</p>}
      >
        <a
          href={`/api/admin/export?what=users`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.03] px-3 text-sm text-white shadow-key hover:bg-white/[0.07]"
        >
          <Download className="size-4" /> {t('Export CSV')}
        </a>
      </PageHeader>

      {params.deleted ? <p className="text-sm text-success">{t('The account was deleted.')}</p> : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form className="relative flex-1" action="/admin/users">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-smoke" />
          <input
            name="q"
            defaultValue={q}
            placeholder={t('Search by name, username or email')}
            className={cn(fieldClass, 'h-10 pl-9')}
          />
          {filter !== 'all' ? <input type="hidden" name="filter" value={filter} /> : null}
          {sort !== 'newest' ? <input type="hidden" name="sort" value={sort} /> : null}
        </form>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-ink p-1 shadow-key">
          {Object.entries(SORTS).map(([value, option]) => (
            <Link
              key={value}
              href={query({ sort: value === 'newest' ? undefined : value })}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-[13px] transition-colors',
                sort === value ? 'bg-white/[0.08] text-white' : 'text-ash hover:text-white',
              )}
            >
              {t(option.label)}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Object.entries(FILTERS).map(([value, option]) => {
          const count = all.filter(option.test).length
          return (
            <Link
              key={value}
              href={query({ filter: value === 'all' ? undefined : value })}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                filter === value ? 'bg-mist text-primary-foreground' : 'bg-white/[0.04] text-ash hover:text-white',
              )}
            >
              {t(option.label)} <span className="tabular-nums opacity-70">{count}</span>
            </Link>
          )
        })}
      </div>

      <div className={cn(cardClass, 'overflow-hidden')}>
        {shown.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Account', 'Role', 'Attempts', 'Joined', 'Last visit', 'Admin'].map((head) => (
                    <th key={head} className="eyebrow px-5 py-3 font-normal">
                      {t(head)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {shown.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <Link href={`/admin/users/${row.id}`} prefetch className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-graphite text-[11px] font-medium text-mist">
                          {initials(row.full_name || row.username || row.email)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-white hover:underline">
                            {displayName(row, t)}
                            {row.id === me ? <span className="ml-2 text-xs text-smoke">{t('you')}</span> : null}
                          </p>
                          <p className="truncate text-xs text-ash">{row.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ash">
                      {row.role === 'teacher' ? t('Teacher') : t('Student')}
                      {row.grade ? <span className="text-smoke"> · {t(row.grade)}</span> : null}
                      <span className="mt-1 flex flex-wrap gap-1">
                        {row.banned_at ? <Badge tone="coral">{t('blocked')}</Badge> : null}
                        {!row.email_confirmed_at ? <Badge tone="warning">{t('unconfirmed')}</Badge> : null}
                        {!row.onboarding_completed_at ? <Badge tone="muted">{t('not onboarded')}</Badge> : null}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-[13px] text-white tabular-nums">
                      {row.attempts}
                      {row.avg_score !== null ? <span className="ml-1.5 text-smoke">· {row.avg_score}</span> : null}
                    </td>
                    <td className="px-5 py-3 text-ash">{shortDate(row.created_at, locale)}</td>
                    <td className="px-5 py-3 text-ash">
                      {row.last_visit ? ago(`${row.last_visit}T12:00:00Z`, t, locale) : '—'}
                      {row.visits_30d ? <span className="block text-[11px] text-smoke">{t('{n} days in 30', { n: row.visits_30d })}</span> : null}
                    </td>
                    <td className="px-5 py-3">
                      <AdminToggle userId={row.id} isAdmin={row.is_admin} isSelf={row.id === me} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-ash">{needle ? t('Nobody matches that search.') : t('No users yet.')}</p>
        )}
      </div>

      {pages > 1 ? (
        <nav className="flex items-center justify-center gap-2 text-sm" aria-label={t('Pages')}>
          {page > 1 ? (
            <Link href={query({ page: String(page - 1) })} className="rounded-lg px-3 py-1.5 text-ash hover:text-white">
              ← {t('Previous')}
            </Link>
          ) : null}
          <span className="font-mono text-xs text-smoke">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={query({ page: String(page + 1) })} className="rounded-lg px-3 py-1.5 text-ash hover:text-white">
              {t('Next')} →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  )
}

function Badge({ tone, children }: { tone: 'coral' | 'warning' | 'muted'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'rounded-md px-1.5 py-0.5 text-[11px]',
        tone === 'coral' && 'bg-coral/10 text-coral',
        tone === 'warning' && 'bg-warning/10 text-warning',
        tone === 'muted' && 'bg-white/[0.05] text-smoke',
      )}
    >
      {children}
    </span>
  )
}
