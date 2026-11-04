import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { TaskEditor, type EditableTask } from '@/components/admin/task-editor'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { getDb } from '@/lib/db'
import { ago } from '@/lib/admin/format'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Problem · Admin') }
}

async function loadTopics(t: (key: string) => string) {
  const db = await getDb()
  const { rows } = await db.query<{ id: string; name: string; subject: string }>(
    `select tp.id, tp.name, s.name as subject from public.topics tp join public.subjects s on s.id = tp.subject_id
      where s.active order by s.name, tp.position, tp.name`,
  )
  return rows.map((row) => ({ id: row.id, label: t(row.name), group: t(row.subject) }))
}

export default async function AdminTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [t, locale, admin] = await Promise.all([getT(), getLocale(), requireAdminPage()])

  if (id === 'new') {
    return (
      <>
        <BackLink href="/admin/tasks">{t('All problems')}</BackLink>
        <PageHeader title={t('New problem')} description={t('It appears in the catalogue as soon as it is saved, unless hidden.')} />
        <TaskEditor task={null} topics={await loadTopics(t)} attempts={0} />
      </>
    )
  }

  const { data: task } = await admin
    .from('tasks')
    .select('id, title, problem, official_solution, hints, difficulty, topic_id, grade_min, grade_max, level, estimated_minutes, source, paper, hidden, class_id, source_url')
    .eq('id', id)
    .maybeSingle()
  if (!task || task.class_id) notFound()

  const [topics, { count: attempts }, { data: recent }, { data: reports }] = await Promise.all([
    loadTopics(t),
    admin.from('task_attempts').select('id', { count: 'exact', head: true }).eq('task_id', id),
    admin.from('task_attempts').select('id, user_id, score, created_at').eq('task_id', id).order('created_at', { ascending: false }).limit(8),
    admin.from('task_reports').select('id, kind, status, message, created_at').eq('task_id', id).order('created_at', { ascending: false }).limit(10),
  ])

  return (
    <>
      <BackLink href="/admin/tasks">{t('All problems')}</BackLink>
      <PageHeader
        title={task.title}
        note={<p className="font-mono text-[11px] text-smoke">{task.id}</p>}
      >
        {!task.hidden ? (
          <Link
            href={`/tasks/${task.id}`}
            target="_blank"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.03] px-3 text-sm text-white shadow-key hover:bg-white/[0.07]"
          >
            <ExternalLink className="size-4" /> {t('Open as a student')}
          </Link>
        ) : null}
        {task.source_url ? (
          <a
            href={task.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.03] px-3 text-sm text-white shadow-key hover:bg-white/[0.07]"
          >
            <ExternalLink className="size-4" /> {t('Original source')}
          </a>
        ) : null}
      </PageHeader>

      <TaskEditor task={task as EditableTask} topics={topics} attempts={attempts ?? 0} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={cn(cardClass, 'p-5')}>
          <h2 className="text-[15px] font-medium text-white">
            {t('Attempts')} <span className="text-smoke">· {attempts ?? 0}</span>
          </h2>
          {recent?.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {recent.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <Link href={`/admin/users/${row.user_id}`} className="text-ash hover:text-white">
                    {ago(row.created_at, t, locale)}
                  </Link>
                  <span className="font-mono text-white">{Math.round(row.score)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ash">{t('No attempts yet.')}</p>
          )}
        </section>
        <section className={cn(cardClass, 'p-5')}>
          <h2 className="text-[15px] font-medium text-white">{t('Reports')}</h2>
          {reports?.length ? (
            <ul className="mt-3 space-y-3 text-sm">
              {reports.map((row) => (
                <li key={row.id}>
                  <p className="font-mono text-[11px] text-smoke">
                    {t(row.kind === 'grading' ? 'grading' : 'statement')} · {t(row.status)} · {ago(row.created_at, t, locale)}
                  </p>
                  <p className="mt-0.5 text-ash">{row.message}</p>
                </li>
              ))}
              <li>
                <Link href="/admin/reports" className="text-xs text-ash hover:text-white">
                  {t('Answer reports')} →
                </Link>
              </li>
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ash">{t('No reports.')}</p>
          )}
        </section>
      </div>
    </>
  )
}
