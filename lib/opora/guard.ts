import { redactAnswer } from '@/lib/sulu/redact'

/**
 * The check after the model answers and before the student sees it: did a
 * hint give the answer away, and will its formulas render?
 *
 * Pure, so it can be reasoned about on its own.
 */

/** LaTeX reduced to what matters for comparison: no spaces, braces or delimiters. */
export function normalizeMath(text: string) {
  return text
    .toLowerCase()
    .replace(/\\[()[\]]|\$/g, '')
    .replace(/\\(left|right|displaystyle|,|;|!|quad)/g, '')
    .replace(/[\s{}]/g, '')
    .replace(/\\cdot|\\times/g, '*')
}

/** True when the reply contains the card's final answer (only for answers distinctive enough to match). */
export function revealsAnswer(reply: string, finalAnswer: string | null) {
  if (!finalAnswer) return false
  // "a = 2g/3" and "2g/3" are both the answer; compare the right-hand side.
  const target = normalizeMath(finalAnswer.split('=').pop() ?? finalAnswer)
  if (target.length < 4) return false
  return normalizeMath(reply).includes(target)
}

function count(text: string, token: string) {
  return text.split(token).length - 1
}

/** Closes delimiters the model left open, so a formula does not swallow the rest of the reply. */
export function balanceMath(text: string): { text: string; fixed: boolean } {
  let out = text
  let fixed = false
  for (const [open, close] of [
    ['\\(', '\\)'],
    ['\\[', '\\]'],
  ] as const) {
    const missing = count(out, open) - count(out, close)
    if (missing > 0) {
      out += close.repeat(missing)
      fixed = true
    }
  }
  if (count(out.replace(/\\\$/g, ''), '$$') % 2 === 1) {
    out += '$$'
    fixed = true
  }
  return { text: out, fixed }
}

export type GuardResult = { text: string; guarded: boolean; leaked: boolean }

/**
 * Below the walkthrough level a reply that states the answer is not shown:
 * sentences that quote the reference solution's numbers are dropped, and a
 * reply that still contains the final answer is replaced by `fallback`.
 */
export function guardReply(
  reply: string,
  options: { level: number; finalAnswer: string | null; officialSolution: string | null; fallback: string },
): GuardResult {
  let text = reply.trim()
  let guarded = false
  let leaked = false

  if (options.level < 4) {
    const redacted = redactAnswer(text, options.officialSolution)
    if (redacted.redacted) {
      guarded = true
      leaked = true
      text = redacted.text ?? ''
    }
    if (text && revealsAnswer(text, options.finalAnswer)) {
      guarded = true
      leaked = true
      text = ''
    }
    if (!text) text = options.fallback
  }

  const balanced = balanceMath(text)
  if (balanced.fixed) guarded = true
  return { text: balanced.text, guarded, leaked }
}
