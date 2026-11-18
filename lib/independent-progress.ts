import 'server-only'

import { getDb } from '@/lib/db'

/**
 * The measures of progress that count: new problems solved on the first try
 * without help, papers, how often mistakes repeat, and the time it took. XP
 * stays as motivation; it is not a measure of skill.
 *
 * "Without help" means no hint, no Opora card and no Sulu chat on that task
 * before the first attempt (ai_usage and chat_sessions record both).
 */
export type IndependentProgress = {
  /** First attempts on problems never tried before, last 30 days. */
  firstTries: number
  /** Of those, solved with no help beforehand. */
  independentSolved: number
  independentRate: number | null
  /** Same rate for the 30 days before, to show the direction. */
  previousRate: number | null
  helpedShare: number | null
  papers: { at: string; score: number }[]
  /** Mistakes logged in a topic that already had one (lower is better). */
  repeatRate: number | null
  fixedMistakes: number
  openMistakes: number
  /** Planned-session minutes actually done in the last 7 days. */
  minutesLastWeek: number
  /** Average minutes of finished sessions per problem solved independently, last 30 days. */
  minutesPerSolved: number | null
}

type FirstRow = { task_id: string; created_at: string; is_correct: boolean; helped: boolean }

function rate(rows: FirstRow[]) {
  if (!rows.length) return null
  return Math.round((rows.filter((row) => row.is_correct && !row.helped).length / rows.length) * 100)
}

export async function independentProgress(userId: string): Promise<IndependentProgress> {
  const db = await getDb()
  const [{ rows: firsts }, { rows: papers }, { rows: mistakes }, { rows: minutes }] = await Promise.all([
    db.query<FirstRow>(
      `with first as (
         select distinct on (a.task_id) a.task_id, a.created_at, a.is_correct
           from public.task_attempts a
          where a.user_id = $1 and a.mock_test_id is null
          order by a.task_id, a.created_at
       )
       select f.task_id, f.created_at, f.is_correct,
              (exists (select 1 from public.ai_usage u where u.user_id = $1 and u.task_id = f.task_id and u.created_at < f.created_at)
               or exists (select 1 from public.chat_sessions c where c.user_id = $1 and c.task_id = f.task_id and c.created_at < f.created_at)) as helped
         from first f
        where f.created_at > now() - interval '60 days'`,
      [userId],
    ),
    db.query<{ submitted_at: string; score_percent: number }>(
      `select submitted_at, score_percent from public.mock_tests
        where user_id = $1 and submitted_at is not null and score_percent is not null and not submitted_late
        order by submitted_at desc limit 8`,
      [userId],
    ),
    db.query<{ created_at: string; status: string; topic: string | null }>(
      `select m.created_at, m.status, t.topic_id::text as topic
         from public.mistake_entries m join public.tasks t on t.id = m.task_id where m.user_id = $1`,
      [userId],
    ).catch(() => ({ rows: [] as { created_at: string; status: string; topic: string | null }[] })),
    db.query<{ week: number; month: number }>(
      `select coalesce(sum(minutes) filter (where completed_at > now() - interval '7 days'), 0)::int as week,
              coalesce(sum(minutes) filter (where completed_at > now() - interval '30 days'), 0)::int as month
         from public.preparation_sessions where user_id = $1 and completed_at is not null`,
      [userId],
    ).catch(() => ({ rows: [{ week: 0, month: 0 }] })),
  ])

  const cutoff = Date.now() - 30 * 86_400_000
  const recent = firsts.filter((row) => new Date(row.created_at).getTime() >= cutoff)
  const earlier = firsts.filter((row) => new Date(row.created_at).getTime() < cutoff)
  const independentSolved = recent.filter((row) => row.is_correct && !row.helped).length

  const seenTopics = new Set<string>()
  let repeated = 0
  for (const row of [...mistakes].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (row.topic && seenTopics.has(row.topic)) repeated += 1
    if (row.topic) seenTopics.add(row.topic)
  }

  return {
    firstTries: recent.length,
    independentSolved,
    independentRate: rate(recent),
    previousRate: rate(earlier),
    helpedShare: recent.length ? Math.round((recent.filter((row) => row.helped).length / recent.length) * 100) : null,
    papers: papers.map((paper) => ({ at: paper.submitted_at, score: paper.score_percent })).reverse(),
    repeatRate: mistakes.length ? Math.round((repeated / mistakes.length) * 100) : null,
    fixedMistakes: mistakes.filter((row) => row.status === 'fixed').length,
    openMistakes: mistakes.filter((row) => row.status !== 'fixed').length,
    minutesLastWeek: minutes[0]?.week ?? 0,
    minutesPerSolved: independentSolved ? Math.round((minutes[0]?.month ?? 0) / independentSolved) : null,
  }
}
