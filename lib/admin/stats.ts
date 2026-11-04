import 'server-only'

import { getDb } from '@/lib/db'

/**
 * The numbers on the admin overview, in a few queries rather than a dozen
 * round trips. Counts are ints; averages are rounded.
 */
export async function getOverviewStats() {
  const db = await getDb()
  const [{ rows: totals }, { rows: topTasks }, { rows: hardTasks }, { rows: graders }] = await Promise.all([
    db.query<Record<string, number | null>>(`
      select
        (select count(*) from auth.users)::int as users,
        (select count(*) from auth.users where created_at > now() - interval '7 days')::int as users_7d,
        (select count(*) from auth.users where created_at > now() - interval '30 days')::int as users_30d,
        (select count(*) from auth.users where email_confirmed_at is null)::int as unconfirmed,
        (select count(*) from auth.users where banned_at is not null)::int as blocked,
        (select count(*) from public.profiles where role = 'teacher')::int as teachers,
        (select count(*) from public.profiles where is_admin)::int as admins,
        (select count(*) from public.profiles where onboarding_completed_at is not null)::int as onboarded,
        (select count(distinct user_id) from public.daily_visits where day = current_date)::int as active_today,
        (select count(distinct user_id) from public.daily_visits where day > current_date - 7)::int as active_7d,
        (select count(distinct user_id) from public.daily_visits where day > current_date - 30)::int as active_30d,
        (select count(*) from public.task_attempts)::int as attempts,
        (select count(*) from public.task_attempts where created_at > now() - interval '7 days')::int as attempts_7d,
        (select count(*) from public.task_attempts where created_at > now() - interval '1 day')::int as attempts_24h,
        (select round(avg(score))::int from public.task_attempts where created_at > now() - interval '7 days') as avg_score_7d,
        (select count(*) from public.task_attempts where is_correct and created_at > now() - interval '7 days')::int as correct_7d,
        (select count(*) from public.mock_tests where submitted_at is not null)::int as mocks,
        (select count(*) from public.chat_sessions)::int as chats,
        (select count(*) from public.chat_messages where role = 'user' and created_at > now() - interval '7 days')::int as questions_7d,
        (select count(*) from public.task_reports where status = 'open')::int as open_reports,
        (select count(*) from public.classes)::int as classes,
        (select count(*) from public.class_members)::int as class_members,
        (select count(*) from public.tasks where class_id is null and not hidden)::int as tasks,
        (select count(*) from public.tasks where hidden)::int as hidden_tasks,
        (select count(*) from public.competitions)::int as olympiads,
        (select count(*) from public.resources)::int as material
    `),
    db.query<{ id: string; title: string; attempts: number; avg_score: number }>(`
      select t.id, t.title, count(*)::int as attempts, round(avg(a.score))::int as avg_score
        from public.task_attempts a join public.tasks t on t.id = a.task_id
       where a.created_at > now() - interval '30 days'
       group by t.id, t.title order by count(*) desc limit 6`),
    // Hardest by result, among problems with enough attempts to say so.
    db.query<{ id: string; title: string; attempts: number; avg_score: number }>(`
      select t.id, t.title, count(*)::int as attempts, round(avg(a.score))::int as avg_score
        from public.task_attempts a join public.tasks t on t.id = a.task_id
       group by t.id, t.title having count(*) >= 3 order by avg(a.score) asc limit 6`),
    db.query<{ graded_by: string; n: number }>(`
      select graded_by, count(*)::int as n from public.task_attempts
       where created_at > now() - interval '30 days' group by graded_by order by 2 desc`),
  ])
  return { totals: totals[0] ?? {}, topTasks, hardTasks, graders }
}

export async function getSystemInfo() {
  const db = await getDb()
  const { rows } = await db.query<{ migrations: number; last_migration: string | null; db_size: string | null }>(`
    select (select count(*) from olympai_meta.migrations)::int as migrations,
           (select max(version) from olympai_meta.migrations) as last_migration,
           pg_size_pretty(pg_database_size(current_database())) as db_size`)
  return rows[0]
}
