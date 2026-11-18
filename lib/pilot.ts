import 'server-only'

import { getDb } from '@/lib/db'

/**
 * Trying the coaching updates on a small group first. An admin puts accounts
 * in the pilot (and, for comparison, a control group); each gets the date it
 * joined. The page then compares the two weeks before joining with the two
 * weeks after, for each group:
 *   - independent first-try rate on new problems (no hint or Sulu before),
 *   - plan feasibility: share of past planned sessions actually completed,
 *   - return: share of members active on at least three days in the window.
 */

export type CohortMetrics = {
  cohort: 'pilot' | 'control'
  members: number
  before: WindowMetrics
  after: WindowMetrics
}
export type WindowMetrics = { independentRate: number | null; firstTries: number; planDone: number | null; plannedSessions: number; returnRate: number | null }

const WINDOW_DAYS = 14

export async function setCohort(identifiers: string[], cohort: 'pilot' | 'control' | null) {
  const db = await getDb()
  const clean = identifiers.map((value) => value.trim().toLowerCase().replace(/^@/, '')).filter(Boolean).slice(0, 500)
  if (!clean.length) return { matched: 0 }
  const { rows } = await db.query<{ id: string }>(
    `update public.profiles p set cohort = $2, cohort_since = case when $2::text is null then null when p.cohort is distinct from $2 then now() else p.cohort_since end
       from auth.users u
      where u.id = p.id and (lower(p.username) = any($1::text[]) or lower(u.email) = any($1::text[]))
      returning p.id`,
    [clean, cohort],
  )
  return { matched: rows.length }
}

export async function cohortMembers() {
  const db = await getDb()
  const { rows } = await db.query<{ id: string; username: string | null; full_name: string | null; cohort: 'pilot' | 'control'; cohort_since: string }>(
    `select id, username, full_name, cohort, cohort_since from public.profiles where cohort is not null order by cohort, cohort_since desc`,
  )
  return rows
}

async function windowMetrics(cohort: 'pilot' | 'control', side: 'before' | 'after'): Promise<WindowMetrics> {
  const db = await getDb()
  const range = side === 'before'
    ? `a_at >= p.cohort_since - make_interval(days => ${WINDOW_DAYS}) and a_at < p.cohort_since`
    : `a_at >= p.cohort_since and a_at < p.cohort_since + make_interval(days => ${WINDOW_DAYS})`
  const { rows: first } = await db.query<{ tries: number; alone: number }>(
    `with members as (select id, cohort_since from public.profiles where cohort = $1),
     firsts as (
       select distinct on (a.user_id, a.task_id) a.user_id, a.task_id, a.created_at as a_at, a.is_correct
         from public.task_attempts a join members m on m.id = a.user_id
        where a.mock_test_id is null
        order by a.user_id, a.task_id, a.created_at
     )
     select count(*)::int as tries,
            count(*) filter (where f.is_correct and not exists (select 1 from public.ai_usage u where u.user_id = f.user_id and u.task_id = f.task_id and u.created_at < f.a_at)
                                               and not exists (select 1 from public.chat_sessions c where c.user_id = f.user_id and c.task_id = f.task_id and c.created_at < f.a_at))::int as alone
       from firsts f join members p on p.id = f.user_id
      where ${range}`,
    [cohort],
  )
  const { rows: plan } = await db.query<{ planned: number; done: number }>(
    `with members as (select id, cohort_since from public.profiles where cohort = $1)
     select count(*)::int as planned, count(*) filter (where s.completed_at is not null)::int as done
       from public.preparation_sessions s join members p on p.id = s.user_id
       cross join lateral (select s.on_date::timestamptz as a_at) x
      where s.superseded_at is null and s.on_date < current_date and ${range}`,
    [cohort],
  ).catch(() => ({ rows: [{ planned: 0, done: 0 }] }))
  const { rows: active } = await db.query<{ members: number; returning: number }>(
    `with members as (select id, cohort_since from public.profiles where cohort = $1),
     days as (
       select a.user_id, (a.created_at at time zone 'Asia/Almaty')::date as d, a.created_at as a_at
         from public.task_attempts a join members m on m.id = a.user_id
     )
     select (select count(*)::int from members) as members,
            count(*) filter (where n >= 3)::int as returning
       from (select d2.user_id, count(distinct d2.d) as n from days d2 join members p on p.id = d2.user_id where ${range.replaceAll('a_at', 'd2.a_at')} group by d2.user_id) per`,
    [cohort],
  )
  const tries = first[0]?.tries ?? 0
  const planned = plan[0]?.planned ?? 0
  const members = active[0]?.members ?? 0
  return {
    firstTries: tries,
    independentRate: tries ? Math.round(((first[0]?.alone ?? 0) / tries) * 100) : null,
    plannedSessions: planned,
    planDone: planned ? Math.round(((plan[0]?.done ?? 0) / planned) * 100) : null,
    returnRate: members ? Math.round(((active[0]?.returning ?? 0) / members) * 100) : null,
  }
}

export async function cohortComparison(): Promise<CohortMetrics[]> {
  const db = await getDb()
  const { rows } = await db.query<{ cohort: 'pilot' | 'control'; n: number }>(
    `select cohort, count(*)::int as n from public.profiles where cohort is not null group by cohort`,
  )
  const out: CohortMetrics[] = []
  for (const cohort of ['pilot', 'control'] as const) {
    const members = rows.find((row) => row.cohort === cohort)?.n ?? 0
    if (!members) continue
    const [before, after] = await Promise.all([windowMetrics(cohort, 'before'), windowMetrics(cohort, 'after')])
    out.push({ cohort, members, before, after })
  }
  return out
}
