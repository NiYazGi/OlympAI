import type { Verdict } from '@/lib/sulu/types'

/**
 * XP is derived, never stored.
 *
 * Every figure below is recomputed from task_attempts on read, exactly like the
 * streak and topic mastery. There is no counter to drift, nothing for a client
 * to write, and no way for a stale value to disagree with the attempts it was
 * supposed to summarise. It also means the rules here can change and every
 * account's history re-scores itself.
 */

export type XpAttempt = {
  taskId: string
  difficulty: number
  isCorrect: boolean
  score: number
  createdAt: string
}

/** A wrong answer still earns something: showing up is the habit being built. */
const VERDICT_SHARE: Record<'solved' | 'partial' | 'poor', number> = {
  solved: 1,
  partial: 0.4,
  poor: 0.15,
}

/**
 * Later attempts at a task you have already solved are worth a tenth.
 *
 * Without this, the cheapest way to a high level is to resubmit one solved
 * problem forever, which is the opposite of what the number should encourage.
 */
const REPEAT_SOLVED_MULTIPLIER = 0.1

/** What a first solve of this difficulty pays, for showing on a task card. */
export function xpForFirstSolve(difficulty: number): number {
  return Math.max(1, difficulty) * 12
}

/** Difficulty 1 is worth 12 XP solved, difficulty 5 is worth 60. */
export function attemptXp(attempt: XpAttempt, alreadySolved: boolean): number {
  const base = Math.max(1, attempt.difficulty) * 12
  const share = attempt.isCorrect
    ? VERDICT_SHARE.solved
    : attempt.score >= 40
      ? VERDICT_SHARE.partial
      : VERDICT_SHARE.poor
  const multiplier = alreadySolved ? REPEAT_SOLVED_MULTIPLIER : 1
  return Math.round(base * share * multiplier)
}

/**
 * Walks attempts oldest-first so "already solved" means solved *before* this
 * one, not solved at any point.
 */
export function totalXp(attempts: XpAttempt[]): number {
  const solved = new Set<string>()
  let total = 0
  for (const attempt of [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    total += attemptXp(attempt, solved.has(attempt.taskId))
    if (attempt.isCorrect) solved.add(attempt.taskId)
  }
  return total
}

/** XP earned on a given UTC day — the same day boundary the streak uses. */
export function xpOnDay(attempts: XpAttempt[], utcDay: string): number {
  const solved = new Set<string>()
  let total = 0
  for (const attempt of [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const wasSolved = solved.has(attempt.taskId)
    if (attempt.createdAt.slice(0, 10) === utcDay) total += attemptXp(attempt, wasSolved)
    if (attempt.isCorrect) solved.add(attempt.taskId)
  }
  return total
}

/**
 * Levels widen as they go: 100 XP for the first, then each one costs 40 more
 * than the last. Level 10 sits at 2,700 XP, level 20 at 8,600.
 */
const FIRST_LEVEL_COST = 100
const LEVEL_STEP = 40

export function levelFloor(level: number): number {
  const n = level - 1
  return n * FIRST_LEVEL_COST + (LEVEL_STEP * n * (n - 1)) / 2
}

export type LevelProgress = {
  level: number
  /** XP earned inside the current level. */
  into: number
  /** XP the current level costs in total. */
  span: number
  /** 0-100, for a bar. */
  percent: number
  toNext: number
}

export function levelFromXp(xp: number): LevelProgress {
  let level = 1
  while (xp >= levelFloor(level + 1)) level += 1
  const floor = levelFloor(level)
  const span = levelFloor(level + 1) - floor
  const into = xp - floor
  return {
    level,
    into,
    span,
    percent: span > 0 ? Math.round((into / span) * 100) : 0,
    toNext: span - into,
  }
}

/** Used only to explain the rules in the UI, so they are not a black box. */
export function xpForVerdict(difficulty: number, verdict: Verdict): number {
  const isCorrect = verdict === 'correct'
  const score = verdict === 'partially_correct' ? 50 : verdict === 'incorrect' ? 20 : 0
  if (verdict === 'not_an_attempt') return 0
  return attemptXp(
    { taskId: '', difficulty, isCorrect, score, createdAt: '' },
    false,
  )
}
