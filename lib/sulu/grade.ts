import 'server-only'

import {
  GRADE_SCHEMA,
  buildGraderInstructions,
  type GraderContext,
} from '@/lib/sulu/prompt'
import { SULU_MODEL, requestSuluJson } from '@/lib/sulu/provider'
import { redactAnswer } from '@/lib/sulu/redact'
import { VERDICTS, type Verdict } from '@/lib/sulu/types'

export type { Verdict }

export type Grade = {
  verdict: Verdict
  score: number
  feedback: string
  nextHint: string | null
  model: string
  /** True when the answer-secrecy guard had to remove something. */
  redacted: boolean
}

/**
 * The score has to agree with the verdict, so each verdict owns a band and the
 * model only chooses a position inside it.
 *
 * The bands are also stated in the prompt, but a prompt is a request. On the
 * first live run the grader called an attempt partially_correct and scored it
 * 8/100 — almost certainly a mark out of 10 — which would have shown the
 * student a failing grade for work whose method was entirely correct.
 */
const SCORE_BANDS: Record<Verdict, readonly [number, number]> = {
  correct: [85, 100],
  partially_correct: [40, 84],
  incorrect: [5, 39],
  not_an_attempt: [0, 0],
}

function clampToBand(verdict: Verdict, score: number) {
  const [low, high] = SCORE_BANDS[verdict]
  if (!Number.isFinite(score)) return low
  return Math.min(high, Math.max(low, Math.round(score)))
}

type RawGrade = {
  verdict: Verdict
  score: number
  feedback: string
  next_hint: string | null
}

/**
 * Grades one attempt with the model.
 *
 * This replaces a regular expression that looked for the words "therefore",
 * "because", "since" and friends and awarded 100 points to any submission of at
 * least eighty characters containing one of them. That score was written to
 * task_attempts and fed the mastery figures on /progress, so the analytics
 * measured vocabulary rather than understanding.
 *
 * Throws when the provider is unavailable. Callers must surface that to the
 * student rather than substituting a made-up score: an attempt that was never
 * graded must not be recorded as graded.
 */
export async function gradeAttempt(task: GraderContext, answer: string): Promise<Grade> {
  const raw = await requestSuluJson<RawGrade>(
    buildGraderInstructions(task),
    `<student_attempt>\n${answer}\n</student_attempt>`,
    GRADE_SCHEMA as unknown as { name: string; schema: Record<string, unknown> },
  )

  const verdict = VERDICTS.includes(raw.verdict) ? raw.verdict : 'incorrect'

  const rawFeedback =
    typeof raw.feedback === 'string' && raw.feedback.trim() ? raw.feedback.trim() : null
  const rawHint =
    typeof raw.next_hint === 'string' && raw.next_hint.trim() ? raw.next_hint.trim() : null

  const feedback = redactAnswer(rawFeedback, task.officialSolution)
  const hint = redactAnswer(rawHint, task.officialSolution)
  const redacted = feedback.redacted || hint.redacted

  return {
    verdict,
    score: clampToBand(verdict, raw.score),
    feedback:
      feedback.text ??
      (redacted
        ? 'Your method is on the right track, but the final result does not follow from your own equations. Recheck the last substitution.'
        : 'Your attempt was recorded, but the grader did not return usable feedback this time.'),
    nextHint: hint.text,
    model: SULU_MODEL,
    redacted,
  }
}
