import 'server-only'

import { getDb } from '@/lib/db'
import { similarTasks } from '@/lib/mock-lifecycle'
import type { CatalogueTask } from '@/lib/types'

/**
 * The mistake log: every graded attempt that fell short opens an entry; the
 * student writes down why it happened; the app then hands them a new, similar
 * problem. The entry closes only when that problem is solved with no hints and
 * no Sulu — a method that has really been learned, not a solution remembered.
 */

export const MISTAKE_REASONS = ['knowledge', 'method', 'calculation', 'presentation', 'reading', 'time', 'other'] as const
export type MistakeReason = (typeof MISTAKE_REASONS)[number]

export type MistakeEntry = {
  id: string
  taskId: string
  attemptId: string | null
  breakNeed: string | null
  points: number | null
  reason: MistakeReason | null
  note: string
  status: 'open' | 'retest' | 'fixed'
  retestTaskId: string | null
  retestTries: number
  createdAt: string
  reviewedAt: string | null
  fixedAt: string | null
}

type Row = {
  id: string; task_id: string; attempt_id: string | null; break_need: string | null; points: number | null; reason: MistakeReason | null
  note: string; status: MistakeEntry['status']; retest_task_id: string | null; retest_tries: number; created_at: string; reviewed_at: string | null; fixed_at: string | null
}

const toEntry = (row: Row): MistakeEntry => ({
  id: row.id, taskId: row.task_id, attemptId: row.attempt_id, breakNeed: row.break_need, points: row.points, reason: row.reason, note: row.note,
  status: row.status, retestTaskId: row.retest_task_id, retestTries: row.retest_tries, createdAt: row.created_at, reviewedAt: row.reviewed_at, fixedAt: row.fixed_at,
})

/** Did the student get any help on this task before this moment: a hint, a card, or a Sulu chat about it? */
export async function helpedBefore(userId: string, taskId: string, before: string) {
  const db = await getDb()
  const { rows } = await db.query<{ helped: boolean }>(
    `select exists (select 1 from public.ai_usage where user_id = $1 and task_id = $2 and created_at < $3)
         or exists (select 1 from public.chat_sessions where user_id = $1 and task_id = $2 and created_at < $3) as helped`,
    [userId, taskId, before],
  )
  return Boolean(rows[0]?.helped)
}

/**
 * Called after every graded attempt (practice and papers). A shortfall opens
 * or refreshes the entry for that task; a clean solve of a retest task closes
 * the entry that sent the student there; a helped or failed retest hands out
 * another similar problem.
 */
export async function recordOutcome(
  userId: string,
  attempt: { id: string; taskId: string; correct: boolean; points: number | null; breakNeed: string | null; mockTestId?: string | null; at: string },
  catalogue: CatalogueTask[],
) {
  const db = await getDb()
  if (!attempt.correct) {
    await db.query(
      `insert into public.mistake_entries (user_id, task_id, attempt_id, mock_test_id, break_need, points)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (user_id, task_id) do update set
         attempt_id = excluded.attempt_id, break_need = excluded.break_need, points = excluded.points,
         mock_test_id = coalesce(excluded.mock_test_id, public.mistake_entries.mock_test_id),
         -- A fixed method that fails again is a mistake again.
         status = case when public.mistake_entries.status = 'fixed' then 'open' else public.mistake_entries.status end,
         fixed_at = null`,
      [userId, attempt.taskId, attempt.id, attempt.mockTestId ?? null, attempt.breakNeed?.slice(0, 600) ?? null, attempt.points],
    )
  }

  const { rows: waiting } = await db.query<Row>(
    `select * from public.mistake_entries where user_id = $1 and status = 'retest' and retest_task_id = $2`,
    [userId, attempt.taskId],
  )
  for (const entry of waiting) {
    const independent = attempt.correct && !(await helpedBefore(userId, attempt.taskId, attempt.at))
    if (independent) {
      await db.query(`update public.mistake_entries set status = 'fixed', fixed_at = now() where id = $1`, [entry.id])
    } else {
      const source = catalogue.find((task) => task.id === entry.task_id)
      const next = source ? similarTasks(catalogue, source, 1, new Set([entry.task_id, attempt.taskId]))[0] : undefined
      await db.query(
        `update public.mistake_entries set retest_tries = retest_tries + 1, retest_task_id = coalesce($2, retest_task_id) where id = $1`,
        [entry.id, next?.id ?? null],
      )
    }
  }
}

export async function listMistakes(userId: string): Promise<MistakeEntry[]> {
  const db = await getDb()
  const { rows } = await db.query<Row>(
    `select * from public.mistake_entries where user_id = $1
      order by case status when 'open' then 0 when 'retest' then 1 else 2 end, created_at desc limit 200`,
    [userId],
  )
  return rows.map(toEntry)
}

/** The student's review: why it happened. Then a fresh similar problem to solve alone. */
export async function reviewMistake(userId: string, entryId: string, reason: MistakeReason, note: string, catalogue: CatalogueTask[]) {
  const db = await getDb()
  const { rows } = await db.query<Row>('select * from public.mistake_entries where id = $1 and user_id = $2', [entryId, userId])
  const entry = rows[0]
  if (!entry) return null
  const source = catalogue.find((task) => task.id === entry.task_id)
  const retest = source ? similarTasks(catalogue, source, 1, new Set([entry.task_id]))[0] : undefined
  await db.query(
    `update public.mistake_entries set reason = $3, note = $4, reviewed_at = now(), status = 'retest', retest_task_id = $5
      where id = $1 and user_id = $2`,
    [entryId, userId, reason, note.slice(0, 1000), retest?.id ?? null],
  )
  return retest?.id ?? null
}

/** The mistake entry a task is the retest for, so the task page can say "no hints this time". */
export async function retestFor(userId: string, taskId: string) {
  const db = await getDb()
  const { rows } = await db.query<{ id: string; task_id: string }>(
    `select id, task_id from public.mistake_entries where user_id = $1 and status = 'retest' and retest_task_id = $2 limit 1`,
    [userId, taskId],
  )
  return rows[0] ?? null
}

/** How often mistakes repeat: share of entries in topics that already had an earlier one. */
export function recurrence(entries: { taskId: string; createdAt: string }[], topicOf: (taskId: string) => string | undefined) {
  const seen = new Set<string>()
  let repeated = 0
  const ordered = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const entry of ordered) {
    const topic = topicOf(entry.taskId)
    if (!topic) continue
    if (seen.has(topic)) repeated += 1
    seen.add(topic)
  }
  return ordered.length ? Math.round((repeated / ordered.length) * 100) : null
}
