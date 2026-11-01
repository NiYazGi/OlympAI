import 'server-only'

import {
  GRADE_SCHEMA,
  buildGraderInstructions,
  type GraderContext,
} from '@/lib/sulu/prompt'
import { imagesFor } from '@/lib/sulu/images'
import { SULU_MODEL, requestSuluJson } from '@/lib/sulu/provider'
import { redactAnswer } from '@/lib/sulu/redact'
import { VERDICTS, type Verdict } from '@/lib/sulu/types'
import { figuresIn } from '@/lib/statement-figures'
import {
  MAX_POINTS,
  clampPoints,
  readBreakPoint,
  readCriteria,
  readMarks,
  scoreFromPoints,
  solutionLines,
  type BreakPoint,
  type Criterion,
  type Mark,
} from '@/lib/protocol'

export type { Verdict }

export type Grade = {
  verdict: Verdict
  /** Out of 7, inside the verdict's band. */
  points: number
  /** The points scaled to 100, which mastery, XP and the route still read. */
  score: number
  summary: string
  feedback: string
  nextHint: string | null
  marks: Mark[]
  criteria: Criterion[]
  breakPoint: BreakPoint | null
  model: string
  /** True when the answer-secrecy guard had to remove something. */
  redacted: boolean
}

type RawGrade = {
  verdict: Verdict
  points: number
  summary: string
  feedback: string
  next_hint: string | null
  marks: Array<{ from_line: number; to_line: number; kind: string; note: string | null }>
  criteria: Array<{ text: string; max: number; earned: number }>
  break_point: { line: number; need: string; technique: string | null } | null
}

/** The attempt as the grader sees it: the same lines the page will draw, numbered. */
export function numberedAttempt(answer: string) {
  return solutionLines(answer)
    .map((line, index) => `${index + 1}| ${line}`)
    .join('\n')
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
  const lineCount = solutionLines(answer).length
  const raw = await requestSuluJson<RawGrade>(
    buildGraderInstructions(task),
    `<student_attempt>\n${numberedAttempt(answer)}\n</student_attempt>`,
    GRADE_SCHEMA as unknown as { name: string; schema: Record<string, unknown> },
    await imagesFor([...figuresIn(task.problem), task.diagramUrl]),
  )

  const claimed = VERDICTS.includes(raw.verdict) ? raw.verdict : 'incorrect'

  // Every word the student will read passes the same answer-secrecy guard: a
  // margin note can give the result away as easily as the feedback can.
  let redacted = false
  const guard = (value: unknown) => {
    const result = redactAnswer(
      typeof value === 'string' && value.trim() ? value.trim() : null,
      task.officialSolution,
    )
    if (result.redacted) redacted = true
    return result.text
  }

  const feedback = guard(raw.feedback)
  const hint = guard(raw.next_hint)
  const summary = guard(raw.summary)

  const marks = readMarks(
    (raw.marks ?? []).map((mark) => ({
      from: mark.from_line,
      to: mark.to_line,
      kind: mark.kind,
      note: guard(mark.note),
    })),
    lineCount,
  )

  /*
   * The verdict has to agree with the margin. On the first live run of the
   * protocol the grader marked a line as an error and still called the whole
   * solution complete, 7 of 7. A solution with a wrong step in it is not
   * complete — the rules say an arithmetic slip is partially_correct — and one
   * with an unproved step is not worth full marks, though it can still be a +.
   */
  const verdict =
    claimed === 'correct' && marks.some((mark) => mark.kind === 'error') ? 'partially_correct' : claimed
  const ceiling = verdict === 'correct' && marks.some((mark) => mark.kind === 'gap') ? 6 : MAX_POINTS

  /*
   * The points have to agree with the verdict, so each verdict owns a band and
   * the model only chooses a position inside it. The band is also stated in the
   * prompt, but a prompt is a request: on the first live run of the old scale
   * the grader called an attempt partially_correct and scored it 8/100.
   *
   * The scheme has to add up to those points too, or it contradicts them; one
   * that does not is left out and the points stand on their own.
   */
  const points = clampPoints(verdict, Math.min(raw.points, ceiling))
  const criteria = readCriteria(
    (raw.criteria ?? []).map((criterion) => ({ ...criterion, text: guard(criterion.text) })),
  )
  const schemeAddsUp =
    criteria.reduce((sum, criterion) => sum + criterion.max, 0) === MAX_POINTS &&
    criteria.reduce((sum, criterion) => sum + criterion.earned, 0) === points

  // A complete solution has nothing broken in it, whatever the model returned.
  // One that is not complete but came back without a break — the verdict was
  // corrected above, or the model left it out — breaks at its first marked
  // trouble, which is what the student needs pointed at.
  const firstTrouble = marks.find((mark) => mark.kind === 'error' || mark.kind === 'gap')
  const breakPoint =
    verdict === 'correct'
      ? null
      : (raw.break_point
          ? readBreakPoint(
              {
                line: raw.break_point.line,
                need: guard(raw.break_point.need),
                technique: guard(raw.break_point.technique),
              },
              lineCount,
            )
          : null) ??
        (firstTrouble?.note ? { line: firstTrouble.from, need: firstTrouble.note, technique: null } : null)

  const feedbackText =
    feedback ??
    (redacted
      ? 'Your method is on the right track, but the final result does not follow from your own equations. Recheck the last substitution.'
      : 'Your attempt was recorded, but the grader did not return usable feedback this time.')

  return {
    verdict,
    points,
    score: scoreFromPoints(points),
    summary: summary ?? feedbackText.split(/(?<=[.!?])\s/)[0],
    feedback: feedbackText,
    nextHint: hint,
    marks,
    criteria: schemeAddsUp ? criteria : [],
    breakPoint,
    model: SULU_MODEL,
    redacted,
  }
}
