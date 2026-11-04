import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { cardClass, cn, riseDelay } from '@/lib/utils'
import { getLocale, getT } from '@/lib/i18n/server'
import { formatDay } from '@/lib/i18n/config'
import { getOverviewStats } from '@/lib/admin/stats'
import { signupsByDay } from '@/lib/admin/accounts'
import { ago, displayName } from '@/lib/admin/format'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Admin') }
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)

export default async function AdminOverviewPage() {
  const t = await getT()
  const locale = await getLocale()
  const admin = await requireAdminPage()

  const [{ totals, topTasks, hardTasks, graders }, days, { data: recentProfiles }, { data: recentAttempts }] =
    await Promise.all([
      getOverviewStats(),
      signupsByDay(30),
      admin
        .from('profiles')
        .select('id, full_name, username, role, primary_subject, onboarding_completed_at, created_at')
        .order('created_at', { ascending: false })
        .limit(6),
      admin
        .from('task_attempts')
        .select('id, user_id, task_id, is_correct, score, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ])
  const n = (key: string) => Number(totals[key] ?? 0)

  const taskIds = [...new Set((recentAttempts ?? []).map((row) => row.task_id))]
  const userIds = [...new Set((recentAttempts ?? []).map((row) => row.user_id))]
  const [{ data: taskRows }, { data: userRows }] = await Promise.all([
    taskIds.length
      ? admin.from('tasks').select('id, title').in('id', taskIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    userIds.length
      ? admin.from('profiles').select('id, full_name, username').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; username: string | null }[] }),
  ])
  const taskTitle = new Map((taskRows ?? []).map((row) => [row.id, row.title]))
  const userName = new Map((userRows ?? []).map((row) => [row.id, displayName(row, t)]))

  const stats = [
    { label: t('Accounts'), value: n('users'), note: t('+{n} this week · +{m} this month', { n: n('users_7d'), m: n('users_30d') }), href: '/admin/users' },
    { label: t('Active today'), value: n('active_today'), note: t('{n} this week · {m} this month', { n: n('active_7d'), m: n('active_30d') }), href: '/admin/users?sort=active' },
    { label: t('Attempts'), value: n('attempts'), note: t('{n} in 24h · {m} this week', { n: n('attempts_24h'), m: n('attempts_7d') }), href: '/admin/attempts' },
    {
      label: t('Accuracy, 7d'),
      value: n('attempts_7d') ? `${pct(n('correct_7d'), n('attempts_7d'))}%` : '—',
      note: totals.avg_score_7d == null ? t('No attempts this week') : t('Average score {n}', { n: n('avg_score_7d') }),
      href: '/admin/attempts',
    },
    { label: t('Open reports'), value: n('open_reports'), note: t('Waiting for an answer'), href: '/admin/reports', alert: n('open_reports') > 0 },
    { label: t('Problems'), value: n('tasks'), note: t('{n} hidden', { n: n('hidden_tasks') }), href: '/admin/tasks' },
    { label: t('Teachers'), value: n('teachers'), note: t('{n} classes · {m} students in them', { n: n('classes'), m: n('class_members') }), href: '/admin/classes' },
    { label: t('Sulu questions, 7d'), value: n('questions_7d'), note: t('{n} chats all time', { n: n('chats') }), href: null },
    { label: t('Onboarded'), value: `${pct(n('onboarded'), n('users'))}%`, note: t('{n} of {m} accounts', { n: n('onboarded'), m: n('users') }), href: '/admin/users?filter=new' },
    { label: t('Unconfirmed'), value: n('unconfirmed'), note: t('Email code never entered'), href: '/admin/users?filter=unconfirmed' },
    { label: t('Blocked'), value: n('blocked'), note: t('Cannot sign in'), href: '/admin/users?filter=blocked' },
    { label: t('Mock papers'), value: n('mocks'), note: t('Submitted'), href: null },
  ]

  const peak = Math.max(1, ...days.map((day) => Math.max(day.signups, day.visitors)))

  return (
    <>
      <PageHeader title={t('Overview')} description={t('What is happening across OlympAI right now.')} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const body = (
            <>
              <p className="eyebrow">{stat.label}</p>
              <p className={cn('mt-3 text-[30px] leading-none font-normal tabular-nums', stat.alert ? 'text-coral' : 'text-foreground')}>
                {stat.value}
              </p>
              <p className="mt-2 text-xs text-ash">{stat.note}</p>
              {stat.href ? (
                <ArrowUpRight className="absolute top-4 right-4 size-4 text-smoke transition-colors group-hover:text-foreground" />
              ) : null}
            </>
          )
          const className = cn(cardClass, 'rise group relative p-5')
          return stat.href ? (
            <Link key={stat.label} href={stat.href} prefetch className={cn(className, 'lift')} style={riseDelay(i)}>
              {body}
            </Link>
          ) : (
            <div key={stat.label} className={className} style={riseDelay(i)}>
              {body}
            </div>
          )
        })}
      </div>

      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-medium text-foreground">{t('Last 30 days')}</h2>
          <div className="flex items-center gap-4 text-xs text-ash">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-mist" /> {t('Visitors')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-coral" /> {t('Sign-ups')}
            </span>
          </div>
        </div>
        <div className="mt-5 flex h-36 items-end gap-[3px]" role="img" aria-label={t('Visitors and sign-ups per day, last 30 days')}>
          {days.map((day) => (
            <div
              key={day.day}
              className="group relative flex h-full flex-1 items-end justify-center gap-px"
              title={`${formatDay(day.day, locale)}: ${t('{n} visitors', { n: day.visitors })}, ${t('{n} sign-ups', { n: day.signups })}`}
            >
              <span className="w-1/2 rounded-t-sm bg-mist/70 transition-colors group-hover:bg-mist" style={{ height: `${(day.visitors / peak) * 100}%` }} />
              <span className="w-1/2 rounded-t-sm bg-coral/80 transition-colors group-hover:bg-coral" style={{ height: `${(day.signups / peak) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-smoke">
          <span>{days[0] ? formatDay(days[0].day, locale) : ''}</span>
          <span>{days.at(-1) ? formatDay(days.at(-1)!.day, locale) : ''}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <TaskList title={t('Most attempted, 30 days')} rows={topTasks} empty={t('No attempts in the last 30 days.')} t={t} />
        <TaskList title={t('Lowest average score')} rows={hardTasks} empty={t('Not enough attempts yet.')} t={t} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-foreground">{t('Newest accounts')}</h2>
            <Link href="/admin/users" prefetch className="text-xs text-ash hover:text-foreground">
              {t('All users')}
            </Link>
          </div>
          {recentProfiles?.length ? (
            <ul className="mt-4 divide-y divide-foreground/[0.06]">
              {recentProfiles.map((row) => (
                <li key={row.id}>
                  <Link href={`/admin/users/${row.id}`} prefetch className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{displayName(row, t)}</p>
                      <p className="truncate text-xs text-ash">
                        {row.role === 'teacher' ? t('Teacher') : (row.primary_subject ?? t('No subject yet'))} ·{' '}
                        {row.onboarding_completed_at ? t('onboarded') : t('not onboarded')}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-smoke">{ago(row.created_at, t, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ash">{t('Nobody has signed up yet.')}</p>
          )}
        </section>

        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-foreground">{t('Latest graded attempts')}</h2>
            <Link href="/admin/attempts" prefetch className="text-xs text-ash hover:text-foreground">
              {t('All attempts')}
            </Link>
          </div>
          {recentAttempts?.length ? (
            <ul className="mt-4 divide-y divide-foreground/[0.06]">
              {recentAttempts.map((row) => (
                <li key={row.id} className="flex items-center gap-3 py-3">
                  {row.is_correct ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-coral" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{taskTitle.get(row.task_id) ?? t('Deleted task')}</p>
                    <Link href={`/admin/users/${row.user_id}`} className="truncate text-xs text-ash hover:text-foreground">
                      {userName.get(row.user_id) ?? t('Unknown student')}
                    </Link>
                  </div>
                  <span className="shrink-0 text-right font-mono text-[11px] text-smoke">
                    {Math.round(row.score)}
                    <br />
                    {ago(row.created_at, t, locale)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ash">{t('No attempts graded yet.')}</p>
          )}
          {graders.length ? (
            <p className="mt-4 border-t border-foreground/[0.06] pt-3 font-mono text-[11px] text-smoke">
              {t('Graded by, 30 days:')} {graders.map((row) => `${row.graded_by} ${row.n}`).join(' · ')}
            </p>
          ) : null}
        </section>
      </div>
    </>
  )
}

function TaskList({
  title,
  rows,
  empty,
  t,
}: {
  title: string
  rows: { id: string; title: string; attempts: number; avg_score: number }[]
  empty: string
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  return (
    <section className={cn(cardClass, 'p-5 sm:p-6')}>
      <h2 className="text-[15px] font-medium text-foreground">{title}</h2>
      {rows.length ? (
        <ul className="mt-4 divide-y divide-foreground/[0.06]">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/tasks/${row.id}`} prefetch className="flex items-center gap-3 py-2.5 hover:opacity-80">
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{row.title}</span>
                <span className="shrink-0 font-mono text-[11px] text-smoke">
                  {t('{n} att.', { n: row.attempts })} · {t('avg {n}', { n: row.avg_score })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ash">{empty}</p>
      )}
    </section>
  )
}
