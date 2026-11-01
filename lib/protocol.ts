import type { Verdict } from '@/lib/sulu/types'

/**
 * The grader's protocol: points out of seven, the jury's sentence, marks on the
 * solution's own lines, the marking scheme and the first break.
 *
 * Shared by the server that writes it and the screens that draw it, so nothing
 * here may touch the server. The attempt page renders a protocol from a row and
 * the solution panel from the action's reply; both go through the readers below,
 * which trust neither the model nor the database to be well formed.
 */

/** Olympiad problems are marked out of seven. */
export const MAX_POINTS = 7

export type MarkKind = 'ok' | 'gap' | 'error' | 'strong'

export const MARK_KINDS: MarkKind[] = ['ok', 'gap', 'error', 'strong']

/** One mark in the margin, over a run of the solution's numbered lines. */
export type Mark = { from: number; to: number; kind: MarkKind; note: string | null }

/** One item of the marking scheme: what earns points, and how many were earned. */
export type Criterion = { text: string; max: number; earned: number }

/** The first line where the argument stops holding, and what would repair it. */
export type BreakPoint = { line: number; need: string; technique: string | null }

export type Protocol = {
  verdict: Verdict
  /** Out of MAX_POINTS. Attempts graded before the protocol have it derived. */
  points: number
  /** True when `points` was derived from an old score out of 100. */
  pointsDerived: boolean
  score: number
  summary: string | null
  feedback: string
  nextHint: string | null
  marks: Mark[]
  criteria: Criterion[]
  breakPoint: BreakPoint | null
  answer: string
}

/** The sign a verdict is written with in an olympiad protocol. */
export const SIGN: Record<Verdict, string> = {
  correct: '+',
  partially_correct: '±',
  incorrect: '∓',
  not_an_attempt: '−',
}

/**
 * Each verdict owns a band of points, the way it owned a band of the old score,
 * and the bands map onto those: 5 of 7 is 71, inside partially_correct's 40-84.
 */
export const POINT_BANDS: Record<Verdict, readonly [number, number]> = {
  correct: [6, 7],
  partially_correct: [3, 5],
  incorrect: [1, 2],
  not_an_attempt: [0, 0],
}

export function clampPoints(verdict: Verdict, points: number) {
  const [low, high] = POINT_BANDS[verdict]
  if (!Number.isFinite(points)) return low
  return Math.min(high, Math.max(low, Math.round(points)))
}

/** The score the rest of the app reads, from the points: 5 of 7 is 71. */
export function scoreFromPoints(points: number) {
  return Math.round((points * 100) / MAX_POINTS)
}

/** Points for an attempt graded before the protocol, from its score out of 100. */
export function pointsFromScore(verdict: Verdict, score: number) {
  return clampPoints(verdict, (score * MAX_POINTS) / 100)
}

/**
 * The verdict of a stored attempt. The table keeps `is_correct`, the score and,
 * since the protocol, the points; the verdict is whichever band they sit in,
 * the same bands the grader is held to.
 */
export function verdictOf(row: { is_correct: boolean; score: number; points: number | null }): Verdict {
  if (row.is_correct) return 'correct'
  const points = row.points ?? Math.round((row.score * MAX_POINTS) / 100)
  if (row.points === null ? row.score === 0 : points === 0) return 'not_an_attempt'
  if (row.points === null ? row.score < 40 : points <= 2) return 'incorrect'
  return 'partially_correct'
}

type AttemptRow = {
  answer: string
  is_correct: boolean
  score: number
  feedback: string | null
  points: number | null
  summary: string | null
  marks: unknown
  criteria: unknown
  break_point: unknown
}

/**
 * A stored attempt as a protocol. One graded before the protocol existed has
 * no marks, no scheme and no break, and gets none: its points are derived from
 * its score and say so, and its paragraph of feedback is what it shows.
 */
export function protocolFromRow(row: AttemptRow): Protocol {
  const verdict = verdictOf(row)
  const lineCount = solutionLines(row.answer).length
  return {
    verdict,
    points: row.points ?? pointsFromScore(verdict, row.score),
    pointsDerived: row.points === null,
    score: row.score,
    summary: row.summary,
    feedback: row.feedback ?? '',
    nextHint: null,
    marks: readMarks(row.marks, lineCount),
    criteria: readCriteria(row.criteria),
    breakPoint: verdict === 'correct' ? null : readBreakPoint(row.break_point, lineCount),
    answer: row.answer,
  }
}

/** Above this a line is cut at its sentences. */
const LONG_LINE = 160

/**
 * The lines a solution is marked on.
 *
 * The grader is shown these numbered and the page draws them numbered, so the
 * split has to be this one function in both places. Blank lines are dropped,
 * and a long line is cut at its sentences: a derivation typed as one paragraph
 * would otherwise be a single line, and every mark would land on it.
 */
export function solutionLines(answer: string): string[] {
  return answer
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => (line.length > LONG_LINE ? sentencesOf(line) : [line]))
}

/** A sentence ends at . ! ? or ; followed by a space and a capital, digit or formula. */
function sentencesOf(line: string) {
  return line
    .split(/(?<=[.!?;])\s+(?=[A-ZА-ЯЁ0-9(\\$])/u)
    .map((part) => part.trim())
    .filter(Boolean)
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function whole(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

/**
 * Marks as stored, checked against the solution they mark: a run outside its
 * lines, an unknown kind or a reversed range is dropped, overlaps keep the
 * first mark, and the result is in line order.
 */
export function readMarks(value: unknown, lineCount: number): Mark[] {
  if (!Array.isArray(value)) return []
  const marks: Mark[] = []
  const taken = new Set<number>()
  for (const item of value) {
    const row = record(item)
    if (!row) continue
    const from = whole(row.from)
    const to = whole(row.to)
    const kind = row.kind as MarkKind
    if (from === null || to === null || !MARK_KINDS.includes(kind)) continue
    if (from < 1 || to > lineCount || from > to) continue
    let overlaps = false
    for (let line = from; line <= to; line++) if (taken.has(line)) overlaps = true
    if (overlaps) continue
    for (let line = from; line <= to; line++) taken.add(line)
    marks.push({ from, to, kind, note: text(row.note) })
  }
  return marks.sort((a, b) => a.from - b.from)
}

/** Criteria as stored. One whose points do not add up is dropped. */
export function readCriteria(value: unknown): Criterion[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const row = record(item)
    const label = row ? text(row.text) : null
    const max = row ? whole(row.max) : null
    const earned = row ? whole(row.earned) : null
    if (!label || max === null || earned === null) return []
    if (max < 1 || max > MAX_POINTS || earned < 0 || earned > max) return []
    return [{ text: label, max, earned }]
  })
}

/** The break as stored, or null when it points outside the solution. */
export function readBreakPoint(value: unknown, lineCount: number): BreakPoint | null {
  const row = record(value)
  if (!row) return null
  const line = whole(row.line)
  const need = text(row.need)
  if (line === null || line < 1 || line > lineCount || !need) return null
  return { line, need, technique: text(row.technique) }
}
