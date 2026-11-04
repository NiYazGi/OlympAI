import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { UserControls } from '@/components/admin/user-controls'
import { AttemptControls } from '@/components/admin/attempt-controls'
import { AdminToggle } from '@/components/admin/admin-toggle'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { getSessionUserId } from '@/lib/supabase/auth'
import { getAccount } from '@/lib/admin/accounts'
import { ago, displayName, shortDate } from '@/lib/admin/format'
import { GRADES } from '@/lib/profile-options'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('User · Admin') }
}

/**
 * One account, whole: who they are, how they have been doing, what they have
 * submitted, and every control the panel has over it.
 */
export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [t, locale, admin, me] = await Promise.all([getT(), getLocale(), requireAdminPage(), getSessionUserId()])
  const account = await getAccount(id)
  if (!account) notFound()

  const [{ data: profile }, { data: attempts }, { data: mocks }, { data: taught }, { data: joined }, { data: reports }] =
    await Promise.all([
      admin
        .from('profiles')
        .select('primary_subject, level, goal, target_date, target_university, telegram_username, training_intensity, daily_xp_goal')
        .eq('id', id)
        .maybeSingle(),
      admin
        .from('task_attempts')
        .select('id, task_id, score, points, is_correct, graded_by, source, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(40),
      admin
        .from('mock_tests')
        .select('id, task_ids, score_percent, level, started_at, submitted_at')
        .eq('user_id', id)
        .order('started_at', { ascending: false })
        .limit(10),
      admin.from('classes').select('id, name, join_code, created_at').eq('teacher_id', id),
      admin.from('class_members').select('class_id, joined_at').eq('student_id', id),
      admin.from('task_reports').select('id, task_id, kind, status, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
    ])

  const taskIds = [...new Set([...(attempts ?? []).map((row) => row.task_id), ...(reports ?? []).map((row) => row.task_id)])]
  const classIds = (joined ?? []).map((row) => row.class_id)
  const [{ data: tasks }, { data: classes }] = await Promise.all([
    taskIds.length ? admin.from('tasks').select('id, title').in('id', taskIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    classIds.length ? admin.from('classes').select('id, name').in('id', classIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])
  const title = new Map((tasks ?? []).map((row) => [row.id, row.title]))
  const className = new Map((classes ?? []).map((row) => [row.id, row.name]))

  const facts: [string, string][] = [
    [t('Role'), account.role === 'teacher' ? t('Teacher') : t('Student')],
    [t('Joined'), shortDate(account.created_at, locale)],
    [t('Last sign-in'), ago(account.last_sign_in_at, t, locale)],
    [t('Last visit'), account.last_visit ? shortDate(`${account.last_visit}T12:00:00Z`, locale) : '—'],
    [t('Days active, 30d'), String(account.visits_30d)],
    [t('Attempts'), String(account.attempts)],
    [t('Average score'), account.avg_score === null ? '—' : String(account.avg_score)],
    [t('Email'), account.email_confirmed_at ? t('confirmed') : t('unconfirmed')],
    [t('Subject'), profile?.primary_subject ? t(profile.primary_subject) : '—'],
    [t('Level'), profile?.level ? t(profile.level) : '—'],
    [t('Target date'), profile?.target_date ? shortDate(`${profile.target_date}T12:00:00Z`, locale) : '—'],
    [t('Telegram'), profile?.telegram_username ? `@${profile.telegram_username}` : '—'],
  ]

  return (
    <>
      <BackLink href="/admin/users">{t('All users')}</BackLink>
      <PageHeader
        title={displayName(account, t)}
        description={account.email}
        note={<p className="font-mono text-[11px] text-smoke">{account.id}</p>}
      >
        <AdminToggle userId={account.id} isAdmin={account.is_admin} isSelf={account.id === me} />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {facts.map(([label, value]) => (
              <div key={label} className={cn(cardClass, 'p-4')}>
                <dt className="eyebrow">{label}</dt>
                <dd className="mt-2 truncate text-sm text-white">{value}</dd>
              </div>
            ))}
          </dl>

          {profile?.goal || profile?.target_university ? (
            <section className={cn(cardClass, 'space-y-1 p-5 text-sm')}>
              {profile.goal ? <p className="text-ash">{t('Goal')}: <span className="text-white">{t(profile.goal)}</span></p> : null}
              {profile.target_university ? <p className="text-ash">{t('What it is for')}: <span className="text-white">{profile.target_university}</span></p> : null}
            </section>
          ) : null}

          <section className={cn(cardClass, 'overflow-hidden')}>
            <h2 className="border-b border-white/[0.06] px-5 py-4 text-[15px] font-medium text-white">
              {t('Attempts')} <span className="text-smoke">· {t('latest {n}', { n: attempts?.length ?? 0 })}</span>
            </h2>
            {attempts?.length ? (
              <ul className="divide-y divide-white/[0.04]">
                {attempts.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-5 py-3">
                    {row.is_correct ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <XCircle className="size-4 shrink-0 text-coral" />}
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/tasks/${row.task_id}`} className="block truncate text-sm text-white hover:underline">
                        {title.get(row.task_id) ?? row.task_id}
                      </Link>
                      <p className="font-mono text-[11px] text-smoke">
                        {ago(row.created_at, t, locale)} · {row.graded_by}
                        {row.points !== null ? ` · ${row.points}/7` : ''}
                        {row.source !== 'practice' ? ` · ${row.source}` : ''}
                      </p>
                    </div>
                    <AttemptControls id={row.id} score={row.score} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-ash">{t('No attempts yet.')}</p>
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className={cn(cardClass, 'p-5')}>
              <h2 className="text-[15px] font-medium text-white">{t('Mock papers')}</h2>
              {mocks?.length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {mocks.map((row) => (
                    <li key={row.id} className="flex justify-between gap-3">
                      <span className="text-ash">
                        {shortDate(row.started_at, locale)} · {t('{n} {n|problem|problems}', { n: row.task_ids.length })}
                      </span>
                      <span className="font-mono text-white">
                        {row.submitted_at ? `${row.score_percent ?? 0}%` : t('in progress')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ash">{t('None yet.')}</p>
              )}
            </section>

            <section className={cn(cardClass, 'p-5')}>
              <h2 className="text-[15px] font-medium text-white">{t('Classes')}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {(taught ?? []).map((row) => (
                  <li key={row.id} className="text-white">
                    {row.name} <span className="font-mono text-[11px] text-smoke">· {t('teaches')} · {row.join_code}</span>
                  </li>
                ))}
                {(joined ?? []).map((row) => (
                  <li key={row.class_id} className="text-white">
                    {className.get(row.class_id) ?? '—'} <span className="font-mono text-[11px] text-smoke">· {t('student since')} {shortDate(row.joined_at, locale)}</span>
                  </li>
                ))}
                {!taught?.length && !joined?.length ? <li className="text-ash">{t('None yet.')}</li> : null}
              </ul>
            </section>
          </div>

          {reports?.length ? (
            <section className={cn(cardClass, 'p-5')}>
              <h2 className="text-[15px] font-medium text-white">{t('Reports')}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {reports.map((row) => (
                  <li key={row.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate text-ash">{title.get(row.task_id) ?? row.task_id}</span>
                    <span className="shrink-0 font-mono text-[11px] text-smoke">
                      {t(row.kind === 'grading' ? 'grading' : 'statement')} · {t(row.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <UserControls account={account} isSelf={account.id === me} grades={GRADES} />
      </div>
    </>
  )
}
