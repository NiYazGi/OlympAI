import 'server-only'

import { getDb } from '@/lib/db'
import { preparationPhase } from '@/lib/preparation-phases'
import { skillById } from '@/lib/skill-catalogue'
import { trainingToday } from '@/lib/training-time'

/**
 * What a personal coach knows before the student says a word: the goal, how
 * far away it is, which phase of preparation this is, today's session, and
 * the mistakes and weak skills on record. Read on the server for the signed-in
 * student only; the student's private "why" is deliberately not included.
 */
export type PreparationContext = {
  olympiad: string | null
  stage: string | null
  targetDate: string | null
  daysLeft: number | null
  phase: string | null
  desiredResult: string | null
  todaysSession: string | null
  recentMistakes: string[]
  weakSkills: string[]
}

export async function preparationContext(userId: string): Promise<PreparationContext> {
  const db = await getDb()
  const today = trainingToday()
  const [{ rows: goal }, { rows: mistakes }, { rows: session }, { rows: diagnostic }] = await Promise.all([
    db.query<{ competition: string | null; target_date: string | null; goal_set_at: string | null; stage: string | null; desired_result: string | null }>(
      `select c.name as competition, p.target_date::text as target_date, p.goal_set_at::text as goal_set_at,
              pp.competition_stage as stage, pp.desired_result
         from public.profiles p
         left join public.competitions c on c.id = p.target_competition_id
         left join public.preparation_preferences pp on pp.user_id = p.id
        where p.id = $1`,
      [userId],
    ),
    db.query<{ title: string; topic: string; break_need: string | null; status: string }>(
      `select t.title, coalesce(tp.name, '') as topic, m.break_need, m.status
         from public.mistake_entries m join public.tasks t on t.id = m.task_id left join public.topics tp on tp.id = t.topic_id
        where m.user_id = $1 and m.status <> 'fixed' order by m.created_at desc limit 5`,
      [userId],
    ).catch(() => ({ rows: [] as { title: string; topic: string; break_need: string | null; status: string }[] })),
    db.query<{ session_kind: string; minutes: number; task_ids: string[] }>(
      `select session_kind, minutes, task_ids from public.preparation_sessions
        where user_id = $1 and on_date = $2 and completed_at is null and skipped_at is null and superseded_at is null limit 1`,
      [userId, today],
    ).catch(() => ({ rows: [] as { session_kind: string; minutes: number; task_ids: string[] }[] })),
    db.query<{ skill_scores: Record<string, number> | null }>(
      `select result->'skillScores' as skill_scores from public.preparation_diagnostics
        where user_id = $1 and completed_at is not null order by completed_at desc limit 1`,
      [userId],
    ).catch(() => ({ rows: [] as { skill_scores: Record<string, number> | null }[] })),
  ])
  const row = goal[0]
  const target = row?.target_date?.slice(0, 10) ?? null
  const daysLeft = target ? Math.max(0, Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)) : null
  const weakSkills = Object.entries(diagnostic[0]?.skill_scores ?? {})
    .filter(([, score]) => Number(score) < 60)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .slice(0, 4)
    .map(([id]) => skillById(id)?.name ?? id)
  const current = session[0]
  return {
    olympiad: row?.competition ?? null,
    stage: row?.stage ?? null,
    targetDate: target,
    daysLeft,
    phase: target && daysLeft !== null && daysLeft > 0 ? preparationPhase(today, target, row?.goal_set_at?.slice(0, 10) ?? today) : null,
    desiredResult: row?.desired_result?.trim() || null,
    todaysSession: current ? `${current.session_kind}, ${current.minutes} min, ${current.task_ids.length} problem(s)` : null,
    recentMistakes: mistakes.map((m) => `${m.title} (${m.topic})${m.break_need ? ` — broke at: ${m.break_need.slice(0, 160)}` : ''}${m.status === 'retest' ? ' [reviewed, check problem pending]' : ''}`),
    weakSkills,
  }
}
