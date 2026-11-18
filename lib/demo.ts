import 'server-only'

import { createHash } from 'node:crypto'
import { getDb } from '@/lib/db'
import { demoTask } from '@/lib/demo-tasks'
import { gradeAttempt } from '@/lib/sulu/grade'
import type { Protocol } from '@/lib/protocol'

/**
 * The public demo check: the same grader as for students, on a demo problem,
 * with nothing saved but a hashed counter per address for the limits.
 */
const SOLUTIONS: Record<string, string> = {
  'demo-divisibility': String.raw`\(n^2 + 2 = (n+2)(n-2) + 6\). Если \(n+2 \mid n^2+2\), то \(n+2 \mid 6\). Так как \(n \ge 1\), \(n + 2 \ge 3\), значит \(n + 2 \in \{3, 6\}\), \(n \in \{1, 4\}\). Проверка: \(n=1\): \(3 \mid 3\); \(n=4\): \(6 \mid 18\). Ответ: \(n = 1\) и \(n = 4\).`,
  'demo-incline': String.raw`Ось \(Ox\) вдоль плоскости вниз (по движению), \(Oy\) перпендикулярно. Трение направлено против движения, вверх по плоскости. \(Ox: mg\sin\alpha - F_{\text{тр}} = ma\); \(Oy: N - mg\cos\alpha = 0\). Брусок скользит, поэтому \(F_{\text{тр}} = \mu N = \mu mg\cos\alpha\). Итого \(a = g(\sin\alpha - \mu\cos\alpha)\), положительно при \(\operatorname{tg}\alpha > \mu\).`,
  'demo-increasing-run': String.raw`Один проход: cur = 1, best = 1; для i от 2 до n: если a[i] > a[i-1], cur = cur + 1, иначе cur = 1; best = max(best, cur). Корректность: инвариант — cur равно длине самого длинного возрастающего отрезка, оканчивающегося в i (продолжение возможно только при a[i] > a[i-1], иначе отрезок, содержащий i и i-1, не возрастающий). Любой отрезок оканчивается в некотором i, поэтому максимум по i — ответ. Время O(n), память O(1).`,
}

export const DEMO_LIMITS = { perAddressPerHour: 4, perAddressPerDay: 10, allPerDay: 300 }

function addressKey(address: string) {
  return createHash('sha256').update(`olympai-demo:${address}`).digest('hex').slice(0, 32)
}

/** Counts a demo check against the limits; false when one of them is reached. */
export async function takeDemoSlot(address: string): Promise<boolean> {
  const db = await getDb()
  const key = addressKey(address)
  const { rows } = await db.query<{ hour: number; day: number; all_day: number }>(
    `select count(*) filter (where address = $1 and created_at > now() - interval '1 hour')::int as hour,
            count(*) filter (where address = $1)::int as day,
            count(*)::int as all_day
       from public.demo_checks where created_at > now() - interval '1 day'`,
    [key],
  )
  const usage = rows[0] ?? { hour: 0, day: 0, all_day: 0 }
  if (usage.hour >= DEMO_LIMITS.perAddressPerHour || usage.day >= DEMO_LIMITS.perAddressPerDay || usage.all_day >= DEMO_LIMITS.allPerDay) return false
  await db.query('insert into public.demo_checks (address) values ($1)', [key])
  // Old rows are useless; keep the table small.
  await db.query("delete from public.demo_checks where created_at < now() - interval '2 days'")
  return true
}

export async function gradeDemo(taskId: string, answer: string, language: 'ru' | 'en' | 'kk'): Promise<Protocol | null> {
  const task = demoTask(taskId)
  if (!task) return null
  const grade = await gradeAttempt(
    {
      title: task.title,
      problem: task.problem,
      given: [],
      findPrompt: null,
      officialSolution: SOLUTIONS[task.id] ?? null,
      difficulty: task.difficulty,
      hints: task.hints,
      language,
    },
    answer,
  )
  return {
    verdict: grade.verdict,
    points: grade.points,
    pointsDerived: false,
    score: grade.score,
    summary: grade.summary,
    feedback: grade.feedback,
    nextHint: grade.nextHint,
    marks: grade.marks,
    criteria: grade.criteria,
    breakPoint: grade.breakPoint,
    answer,
  }
}
