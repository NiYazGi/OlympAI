import 'server-only'

import { getDb } from '@/lib/db'
import type { CatalogueTask } from '@/lib/types'
import { skillIdsForTask } from '@/lib/skill-catalogue'

/**
 * An open paper blocks starting a new one, so a paper that can no longer be
 * finished must not stay open. Answers live on the student's device until
 * submission, so nothing is lost on the server by closing it.
 */

/** After the clock, an hour more to hand in from a phone that went to sleep. */
export const RESUME_GRACE_MINUTES = 60

export async function closeStalePapers(userId: string) {
  const db = await getDb()
  await db.query(
    `update public.mock_tests set abandoned_at = now()
      where user_id = $1 and submitted_at is null and abandoned_at is null
        and started_at + make_interval(mins => duration_minutes + $2) < now()`,
    [userId, RESUME_GRACE_MINUTES],
  )
}

export async function abandonPaper(userId: string, testId: string) {
  const db = await getDb()
  const { rows } = await db.query<{ id: string }>(
    `update public.mock_tests set abandoned_at = now()
      where id = $1 and user_id = $2 and submitted_at is null and abandoned_at is null returning id`,
    [testId, userId],
  )
  return Boolean(rows[0])
}

export type OlympiadStage = 'School' | 'Regional' | 'National' | 'International'

/**
 * The shape of a paper for the stage the student prepares for: how many
 * problems, how hard, and the least time the round gives. A school round is
 * short and gentle; an international day is three hard problems over five hours.
 */
export const STAGE_FORMAT: Record<OlympiadStage, { shape: number[]; minMinutes: number }> = {
  School: { shape: [1, 2, 2, 3], minMinutes: 90 },
  Regional: { shape: [2, 3, 3, 4, 5], minMinutes: 180 },
  National: { shape: [3, 3, 4, 4, 5], minMinutes: 240 },
  International: { shape: [4, 5, 5], minMinutes: 300 },
}

/**
 * Up to `count` unsolved problems like this one: same subject and topic, the
 * same verified skills first (the method, not just the chapter), then the
 * closest in difficulty.
 */
export function similarTasks(catalogue: CatalogueTask[], task: Pick<CatalogueTask, 'id' | 'subject' | 'topic' | 'difficulty'>, count = 2, exclude: Set<string> = new Set()) {
  const skills = new Set(skillIdsForTask({ id: task.id, subject: task.subject, topic: task.topic }, { verifiedOnly: true }))
  const shared = (candidate: CatalogueTask) =>
    skills.size ? skillIdsForTask({ id: candidate.id, subject: candidate.subject, topic: candidate.topic }, { verifiedOnly: true }).filter((id) => skills.has(id)).length : 0
  return catalogue
    .filter((candidate) => candidate.id !== task.id && !exclude.has(candidate.id) && candidate.subject === task.subject && candidate.topic === task.topic && !candidate.solved && candidate.attempts === 0)
    .map((candidate) => ({ candidate, shared: shared(candidate) }))
    .sort((a, b) => b.shared - a.shared || Math.abs(a.candidate.difficulty - task.difficulty) - Math.abs(b.candidate.difficulty - task.difficulty) || a.candidate.id.localeCompare(b.candidate.id))
    .slice(0, count)
    .map((entry) => entry.candidate)
}
