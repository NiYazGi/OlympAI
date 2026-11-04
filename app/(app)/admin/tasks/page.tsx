import Link from 'next/link'
import { EyeOff, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { getDb } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn, fieldClass } from '@/lib/utils'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Problems · Admin') }
}

const PAGE = 50

type Row = {
  id: string
  title: string
  source: string | null
  difficulty: number
  hidden: boolean
  subject: string
  topic: string
  topic_id: string
  grade_min: number | null
  grade_max: number | null
  has_solution: boolean
  attempts: number
  avg_score: number | null
  open_reports: number
}

/** "Областная олимпиада, 2004" → "Областная олимпиада". */
function olympiadOf(source: string | null) {
  return source?.match(/^(.*?)[\s,]*(?:19|20)\d{2}/)?.[1]?.trim() || null
}

/**
 * The whole library, searchable, with how each problem is doing: attempts,
 * average score, open reports. A problem with reports or a low average is the
 * one to open first.
 */
export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subject?: string; topic?: string; olympiad?: string; show?: string; sort?: string; page?: string }>
}) {
  const t = await getT()
  await requireAdminPage()
  const params = await searchParams
  const db = await getDb()
  const { rows: all } = await db.query<Row>(`
    select t.id, t.title, t.source, t.difficulty, t.hidden, s.name as subject, tp.name as topic, t.topic_id,
           t.grade_min, t.grade_max, (t.official_solution is not null and length(t.official_solution) > 0) as has_solution,
           coalesce(a.attempts, 0)::int as attempts, a.avg_score,
           coalesce(r.open_reports, 0)::int as open_reports
      from public.tasks t
      join public.subjects s on s.id = t.subject_id
      join public.topics tp on tp.id = t.topic_id
      left join (select task_id, count(*) as attempts, round(avg(score))::int as avg_score from public.task_attempts group by task_id) a
        on a.task_id = t.id
      left join (select task_id, count(*) as open_reports from public.task_reports where status = 'open' group by task_id) r
        on r.task_id = t.id
     where t.class_id is null and s.active
     order by t.id`)

  const q = (params.q ?? '').trim().toLowerCase()
  const subject = params.subject ?? ''
  const topic = params.topic ?? ''
  const olympiad = params.olympiad ?? ''
  const show = params.show ?? 'all'
  const sort = params.sort ?? 'id'
  const page = Math.max(1, Number(params.page) || 1)

  const subjects = [...new Set(all.map((row) => row.subject))].sort()
  const topics = [...new Map(all.filter((row) => !subject || row.subject === subject).map((row) => [row.topic_id, row.topic]))].sort(
    (a, b) => a[1].localeCompare(b[1]),
  )
  const olympiads = [...new Set(all.filter((row) => !subject || row.subject === subject).map((row) => olympiadOf(row.source)).filter(Boolean))].sort() as string[]

  const filtered = all
    .filter((row) => !subject || row.subject === subject)
    .filter((row) => !topic || row.topic_id === topic)
    .filter((row) => !olympiad || olympiadOf(row.source) === olympiad)
    .filter((row) =>
      show === 'hidden' ? row.hidden : show === 'reported' ? row.open_reports > 0 : show === 'nosolution' ? !row.has_solution : true,
    )
    .filter((row) => !q || row.id.toLowerCase().includes(q) || row.title.toLowerCase().includes(q) || (row.source ?? '').toLowerCase().includes(q))
    .sort((a, b) =>
      sort === 'attempts'
        ? b.attempts - a.attempts
        : sort === 'score'
          ? (a.avg_score ?? 101) - (b.avg_score ?? 101)
          : sort === 'difficulty'
            ? b.difficulty - a.difficulty
            : a.id.localeCompare(b.id, undefined, { numeric: true }),
    )
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const shown = filtered.slice((page - 1) * PAGE, page * PAGE)

  const href = (patch: Record<string, string | undefined>) => {
    const next: Record<string, string | undefined> = { q: params.q, subject, topic, olympiad, show, sort, ...patch }
    return {
      pathname: '/admin/tasks',
      query: Object.fromEntries(
        Object.entries(next).filter(([key, value]) => value && !(key === 'show' && value === 'all') && !(key === 'sort' && value === 'id')),
      ),
    }
  }

  const counts = {
    all: all.length,
    hidden: all.filter((row) => row.hidden).length,
    reported: all.filter((row) => row.open_reports > 0).length,
    nosolution: all.filter((row) => !row.has_solution).length,
  }

  return (
    <>
      <PageHeader
        title={t('Problems')}
        description={t('The whole library. Edit a statement or its reference solution, hide a broken one, or add a new problem.')}
        note={<p className="font-mono text-[11px] text-smoke">{t('{n} of {m} shown', { n: filtered.length, m: all.length })}</p>}
      >
        <Link
          href="/admin/tasks/new"
          prefetch
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-mist px-3 text-sm text-primary-foreground shadow-button hover:bg-white"
        >
          <Plus className="size-4" /> {t('New problem')}
        </Link>
      </PageHeader>

      <form action="/admin/tasks" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-smoke" />
          <input name="q" defaultValue={params.q ?? ''} placeholder={t('Search: title, id, source')} className={cn(fieldClass, 'h-10 pl-9')} />
        </label>
        <select name="subject" defaultValue={subject} className={cn(fieldClass, 'h-10')} aria-label={t('Subject')}>
          <option value="">{t('All subjects')}</option>
          {subjects.map((name) => (
            <option key={name} value={name}>
              {t(name)}
            </option>
          ))}
        </select>
        <select name="topic" defaultValue={topic} className={cn(fieldClass, 'h-10')} aria-label={t('Topic')}>
          <option value="">{t('All topics')}</option>
          {topics.map(([id, name]) => (
            <option key={id} value={id}>
              {t(name)}
            </option>
          ))}
        </select>
        <select name="olympiad" defaultValue={olympiad} className={cn(fieldClass, 'h-10')} aria-label={t('Olympiad')}>
          <option value="">{t('All olympiads')}</option>
          {olympiads.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select name="sort" defaultValue={sort} className={cn(fieldClass, 'h-10')} aria-label={t('Sort')}>
            <option value="id">{t('By id')}</option>
            <option value="attempts">{t('Most attempts')}</option>
            <option value="score">{t('Lowest average')}</option>
            <option value="difficulty">{t('Hardest')}</option>
          </select>
          {show !== 'all' ? <input type="hidden" name="show" value={show} /> : null}
          <button type="submit" className="h-10 shrink-0 rounded-lg bg-white/[0.06] px-3 text-sm text-white hover:bg-white/[0.1]">
            {t('Apply')}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['all', 'Everything'],
            ['reported', 'With open reports'],
            ['hidden', 'Hidden'],
            ['nosolution', 'No reference solution'],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={href({ show: value, page: undefined })}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs transition-colors',
              show === value ? 'bg-mist text-primary-foreground' : 'bg-white/[0.04] text-ash hover:text-white',
            )}
          >
            {t(label)} <span className="tabular-nums opacity-70">{counts[value]}</span>
          </Link>
        ))}
      </div>

      <div className={cn(cardClass, 'overflow-hidden')}>
        {shown.length ? (
          <ul className="divide-y divide-white/[0.04]">
            {shown.map((row) => (
              <li key={row.id}>
                <Link href={`/admin/tasks/${row.id}`} prefetch className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.02]">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm text-white">
                      {row.hidden ? <EyeOff className="size-3.5 shrink-0 text-warning" /> : null}
                      <span className="truncate">{row.title}</span>
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-smoke">
                      {row.id} · {t(row.topic)} · {'★'.repeat(row.difficulty)}
                      {row.grade_min ? ` · ${row.grade_min}–${row.grade_max}` : ''}
                      {!row.has_solution ? ` · ${t('no solution')}` : ''}
                    </p>
                  </div>
                  {row.open_reports ? (
                    <span className="shrink-0 rounded-md bg-coral/10 px-1.5 py-0.5 text-[11px] text-coral">
                      {t('{n} {n|report|reports}', { n: row.open_reports })}
                    </span>
                  ) : null}
                  <span className="w-28 shrink-0 text-right font-mono text-[11px] text-smoke">
                    {row.attempts ? `${t('{n} att.', { n: row.attempts })} · ${row.avg_score}` : '—'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-ash">{t('No problem matches these filters.')}</p>
        )}
      </div>

      {pages > 1 ? (
        <nav className="flex items-center justify-center gap-2 text-sm" aria-label={t('Pages')}>
          {page > 1 ? (
            <Link href={href({ page: String(page - 1) })} className="rounded-lg px-3 py-1.5 text-ash hover:text-white">
              ← {t('Previous')}
            </Link>
          ) : null}
          <span className="font-mono text-xs text-smoke">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={href({ page: String(page + 1) })} className="rounded-lg px-3 py-1.5 text-ash hover:text-white">
              {t('Next')} →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  )
}
