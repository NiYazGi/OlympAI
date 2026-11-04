import Link from 'next/link'
import { CheckCircle2, Download, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { AttemptControls } from '@/components/admin/attempt-controls'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { getDb } from '@/lib/db'
import { ago } from '@/lib/admin/format'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn, fieldClass } from '@/lib/utils'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Attempts · Admin') }
}

const LIMIT = 150

type Row = {
  id: string
  task_id: string
  title: string | null
  user_id: string
  name: string | null
  email: string
  score: number
  points: number | null
  is_correct: boolean
  graded_by: string
  source: string
  created_at: string
  answer: string
  feedback: string | null
}

/**
 * Every graded attempt, newest first, with the answer and the grader's words
 * one click away: where a wrong verdict is found and corrected.
 */
export default async function AdminAttemptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; verdict?: string; grader?: string; days?: string }>
}) {
  const [t, locale] = await Promise.all([getT(), getLocale()])
  await requireAdminPage()
  const params = await searchParams
  const verdict = params.verdict ?? ''
  const grader = params.grader ?? ''
  const days = Math.min(365, Math.max(1, Number(params.days) || 30))
  const q = (params.q ?? '').trim()

  const where = ['a.created_at > now() - make_interval(days => $1)']
  const values: (string | number)[] = [days]
  if (verdict === 'correct') where.push('a.is_correct')
  if (verdict === 'wrong') where.push('not a.is_correct')
  if (grader) {
    values.push(grader)
    where.push(`a.graded_by = $${values.length}`)
  }
  if (q) {
    values.push(`%${q.toLowerCase()}%`)
    const n = values.length
    where.push(`(lower(t.title) like $${n} or lower(a.task_id) like $${n} or lower(u.email) like $${n} or lower(coalesce(p.full_name, '')) like $${n})`)
  }

  const db = await getDb()
  const [{ rows }, { rows: graders }, { rows: summary }] = await Promise.all([
    db.query<Row>(
      `select a.id, a.task_id, t.title, a.user_id, p.full_name as name, u.email, a.score, a.points, a.is_correct,
              a.graded_by, a.source, a.created_at, left(a.answer, 1200) as answer, left(a.feedback, 1200) as feedback
         from public.task_attempts a
         join auth.users u on u.id = a.user_id
         left join public.profiles p on p.id = a.user_id
         left join public.tasks t on t.id = a.task_id
        where ${where.join(' and ')}
        order by a.created_at desc
        limit ${LIMIT}`,
      values,
    ),
    db.query<{ graded_by: string }>('select distinct graded_by from public.task_attempts order by 1'),
    db.query<{ n: number; correct: number; avg: number | null }>(
      `select count(*)::int as n, count(*) filter (where is_correct)::int as correct, round(avg(score))::int as avg
         from public.task_attempts where created_at > now() - make_interval(days => $1)`,
      [days],
    ),
  ])
  const stats = summary[0]

  return (
    <>
      <PageHeader
        title={t('Attempts')}
        description={t('Every graded answer. Open one to read it and the grader’s feedback; correct the score if the verdict was wrong.')}
        note={
          stats ? (
            <p className="font-mono text-[11px] text-smoke">
              {t('{n} in {d} days · {c} correct · average {a}', { n: stats.n, d: days, c: stats.correct, a: stats.avg ?? '—' })}
            </p>
          ) : null
        }
      >
        <a
          href={`/api/admin/export?what=attempts&days=${days}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.03] px-3 text-sm text-white shadow-key hover:bg-white/[0.07]"
        >
          <Download className="size-4" /> {t('Export CSV')}
        </a>
      </PageHeader>

      <form action="/admin/attempts" className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
        <input name="q" defaultValue={q} placeholder={t('Search: problem, student, email')} className={cn(fieldClass, 'h-10')} />
        <select name="verdict" defaultValue={verdict} className={cn(fieldClass, 'h-10')} aria-label={t('Verdict')}>
          <option value="">{t('Any verdict')}</option>
          <option value="correct">{t('Correct')}</option>
          <option value="wrong">{t('Not correct')}</option>
        </select>
        <select name="grader" defaultValue={grader} className={cn(fieldClass, 'h-10')} aria-label={t('Graded by')}>
          <option value="">{t('Any grader')}</option>
          {graders.map((row) => (
            <option key={row.graded_by} value={row.graded_by}>
              {row.graded_by}
            </option>
          ))}
        </select>
        <select name="days" defaultValue={String(days)} className={cn(fieldClass, 'h-10')} aria-label={t('Period')}>
          {[1, 7, 30, 90, 365].map((value) => (
            <option key={value} value={value}>
              {t('{n} days', { n: value })}
            </option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-lg bg-white/[0.06] px-4 text-sm text-white hover:bg-white/[0.1]">
          {t('Apply')}
        </button>
      </form>

      <div className={cn(cardClass, 'overflow-hidden')}>
        {rows.length ? (
          <ul className="divide-y divide-white/[0.04]">
            {rows.map((row) => (
              <li key={row.id} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  {row.is_correct ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-coral" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/tasks/${row.task_id}`} className="block truncate text-sm text-white hover:underline">
                      {row.title ?? row.task_id}
                    </Link>
                    <p className="truncate text-xs text-ash">
                      <Link href={`/admin/users/${row.user_id}`} className="hover:text-white">
                        {row.name || row.email}
                      </Link>
                      <span className="font-mono text-[11px] text-smoke">
                        {' '}· {ago(row.created_at, t, locale)} · {row.graded_by}
                        {row.points !== null ? ` · ${row.points}/7` : ''}
                        {row.source !== 'practice' ? ` · ${row.source}` : ''}
                      </span>
                    </p>
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-[11px] text-smoke hover:text-ash">{t('Answer and feedback')}</summary>
                      <div className="mt-2 grid gap-2 text-xs leading-5 md:grid-cols-2">
                        <p className="rounded-lg bg-white/[0.03] p-3 whitespace-pre-wrap text-mist">{row.answer}</p>
                        <p className="rounded-lg bg-white/[0.03] p-3 whitespace-pre-wrap text-ash">{row.feedback ?? '—'}</p>
                      </div>
                    </details>
                  </div>
                  <AttemptControls id={row.id} score={row.score} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-ash">{t('No attempts match these filters.')}</p>
        )}
      </div>
      {rows.length === LIMIT ? <p className="text-center text-xs text-smoke">{t('Showing the latest {n}. Narrow the filters to see older ones.', { n: LIMIT })}</p> : null}
    </>
  )
}
