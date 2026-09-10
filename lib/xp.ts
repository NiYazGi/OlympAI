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
  // A non-attempt earns nothing. The grader's score bands make 0 unique to the
  // `not_an_attempt` verdict — an incorrect answer floors at 5 — so the ledger
  // can tell "just tell me the answer" apart from a wrong attempt without
  // task_attempts having to store the verdict. Without this, asking for the
  // answer on all 23 tasks pays better than solving the hardest one.
  if (!attempt.isCorrect && attempt.score <= 0) return 0

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

/**
 * Used only to explain the rules in the UI, so they are not a black box.
 *
 * Deliberately a thin wrapper: it used to carry its own copy of the bands and
 * disagreed with the ledger, promising 0 for a non-attempt while attemptXp
 * paid out for one.
 */
export function xpForVerdict(difficulty: number, verdict: Verdict): number {
  const score =
    verdict === 'correct' ? 95 : verdict === 'partially_correct' ? 50 : verdict === 'incorrect' ? 20 : 0
  return attemptXp(
    { taskId: '', difficulty, isCorrect: verdict === 'correct', score, createdAt: '' },
    false,
  )
}

/**
 * XP from quiz answers.
 *
 * The check step was worth nothing, which made the app's own instruction —
 * "read this, then answer six questions" — earn a student exactly zero, while
 * the daily goal sat untouched and the streak stayed at zero days. An app that
 * tells you to do something and then scores you as if you had not is teaching
 * the wrong lesson about what matters.
 *
 * Two rules keep it honest. A question pays once, ever, so re-running a quiz
 * you have already answered earns nothing — the same reasoning that caps a
 * repeated solve at a tenth. And it pays far less than a problem does: getting
 * six questions right is worth about one two-star derivation, because it is
 * worth about that much.
 *
 * Card reviews and "mark as read" deliberately pay nothing. Both are the
 * student's own claim about their own work, and both are written by the client
 * under RLS; paying for them would make the level a measure of clicking. They
 * move the topic's progress instead, where a self-report belongs.
 */
export type XpQuizAnswer = {
  questionId: string
  isCorrect: boolean
  createdAt: string
}

/** Answering at all, once per question. */
const QUIZ_ATTEMPT_XP = 2
/** Getting it right, once per question, on top of the attempt. */
const QUIZ_CORRECT_XP = 4

/** What one question can ever be worth, for showing the rule in the UI. */
export const QUIZ_QUESTION_MAX_XP = QUIZ_ATTEMPT_XP + QUIZ_CORRECT_XP

/**
 * Walks answers oldest-first and pays each question at most once for showing
 * up and once for being right.
 */
function walkQuiz(
  answers: XpQuizAnswer[],
  onEarn: (xp: number, day: string) => void,
): void {
  const attempted = new Set<string>()
  const solved = new Set<string>()

  for (const answer of [...answers].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const day = answer.createdAt.slice(0, 10)
    if (!attempted.has(answer.questionId)) {
      attempted.add(answer.questionId)
      onEarn(QUIZ_ATTEMPT_XP, day)
    }
    if (answer.isCorrect && !solved.has(answer.questionId)) {
      solved.add(answer.questionId)
      onEarn(QUIZ_CORRECT_XP, day)
    }
  }
}

/**
 * What a single answer is worth, given what came before it.
 *
 * The same arithmetic walkQuiz applies over a history, exposed for the moment
 * the answer is submitted so the student can be told immediately. Keeping both
 * in this file is what stops the number shown from drifting from the number
 * counted.
 */
export function quizAnswerXp({
  attemptedBefore,
  solvedBefore,
  isCorrect,
}: {
  attemptedBefore: boolean
  solvedBefore: boolean
  isCorrect: boolean
}): number {
  const forShowingUp = attemptedBefore ? 0 : QUIZ_ATTEMPT_XP
  const forBeingRight = isCorrect && !solvedBefore ? QUIZ_CORRECT_XP : 0
  return forShowingUp + forBeingRight
}

export function quizXp(answers: XpQuizAnswer[]): number {
  let total = 0
  walkQuiz(answers, (xp) => {
    total += xp
  })
  return total
}

export function quizXpOnDay(answers: XpQuizAnswer[], utcDay: string): number {
  let total = 0
  walkQuiz(answers, (xp, day) => {
    if (day === utcDay) total += xp
  })
  return total
}
