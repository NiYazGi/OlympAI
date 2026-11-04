import Link from 'next/link'
import { ReportReview } from '@/components/admin/report-review'
import { PageHeader } from '@/components/page-header'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { cardClass, cn } from '@/lib/utils'
import { getLocale, getT } from '@/lib/i18n/server'
import { formatDate } from '@/lib/i18n/config'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Reports · Admin') }
}

const LIMIT = 100

/**
 * Students' reports about a check or a statement, open ones first. Each comes
 * with the task, and for a grading report the attempt and the grader's words,
 * so it can be settled without asking the student to repeat anything.
 */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>
}) {
  const t = await getT()
  const locale = await getLocale()
  const admin = await requireAdminPage()
  const { show = 'open' } = await searchParams

  let query = admin
    .from('task_reports')
    .select('id, user_id, task_id, attempt_id, kind, message, status, resolution, created_at')
    .order('created_at', { ascending: false })
    .limit(LIMIT)
  if (show === 'open') query = query.eq('status', 'open')
  const { data: reports } = await query
  const rows = reports ?? []

  const taskIds = [...new Set(rows.map((row) => row.task_id))]
  const attemptIds = rows.map((row) => row.attempt_id).filter((id): id is string => Boolean(id))
  const userIds = [...new Set(rows.map((row) => row.user_id))]
  const [{ data: tasks }, { data: attempts }, { data: profiles }] = await Promise.all([
    taskIds.length
      ? admin.from('tasks').select('id, title').in('id', taskIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    attemptIds.length
      ? admin.from('task_attempts').select('id, answer, score, feedback').in('id', attemptIds)
      : Promise.resolve({ data: [] as { id: string; answer: string; score: number; feedback: string | null }[] }),
    userIds.length
      ? admin.from('profiles').select('id, full_name').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ])
  const taskTitle = new Map((tasks ?? []).map((row) => [row.id, row.title]))
  const attempt = new Map((attempts ?? []).map((row) => [row.id, row]))
  const name = new Map((profiles ?? []).map((row) => [row.id, row.full_name]))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('Reports')}
        description={t('"The check is wrong" and "mistake in the statement", sent from task pages.')}
      >
        <div className="flex gap-1 rounded-lg bg-ink p-1 shadow-key">
          {[
            { key: 'open', label: t('Open') },
            { key: 'all', label: t('All') },
          ].map((tab) => (
            <Link
              key={tab.key}
              href={`/admin/reports?show=${tab.key}`}
              className={cn(
                'rounded-md px-3 py-1.5 text-[13px] font-medium',
                show === tab.key ? 'bg-foreground/[0.08] text-foreground' : 'text-ash hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('Nothing waiting. Reports appear here as students send them.')}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const tried = row.attempt_id ? attempt.get(row.attempt_id) : undefined
            return (
              <li key={row.id} className={`${cardClass} space-y-3 p-5`}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium">{row.kind === 'grading' ? t('Check') : t('Statement')}</span>
                  <Link href={`/tasks/${row.task_id}`} className="min-w-0 truncate text-primary hover:underline">
                    {taskTitle.get(row.task_id) ?? row.task_id}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {name.get(row.user_id) ?? '—'} ·{' '}
                    {formatDate(new Date(row.created_at), locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{row.message}</p>
                {tried ? (
                  <details className="rounded-lg bg-foreground/[0.03] p-3 text-sm ring-1 ring-foreground/10">
                    <summary className="cursor-pointer text-muted-foreground">
                      {t('Attempt: {score}/100', { score: tried.score })}
                    </summary>
                    {tried.feedback ? <p className="mt-2 text-foreground/90">{tried.feedback}</p> : null}
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
                      {tried.answer}
                    </pre>
                  </details>
                ) : null}
                {row.status === 'open' ? (
                  <ReportReview reportId={row.id} canRegrade={Boolean(tried)} />
                ) : (
                  <p className="rounded-md bg-accent p-2 text-sm text-accent-foreground">
                    {row.status === 'resolved' ? t('Fixed') : t('Reviewed, no change')}: {row.resolution}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
