/**
 * Last line of defence for the "never state the answer" rule.
 *
 * The instruction alone is not enough: on the first live run the grader was
 * told not to reveal the result and wrote "T = 23.52 N ≈ 23.5 N" anyway,
 * because the student's only mistake had been arithmetic and correcting it felt
 * helpful. Helpful, and the whole point of the exercise gone.
 *
 * Pure and dependency-free so it can be reasoned about and tested directly.
 */

/**
 * Numbers from the reference solution that would give the answer away.
 *
 * Only distinctive literals count: a decimal, or an integer of three digits or
 * more. Small integers (the 2 in `2*m1*m2`, the 3 in `m1 = 3.0 kg`) appear all
 * over legitimate feedback, and matching them would gut every sentence.
 */
export function revealingNumbers(officialSolution: string | null): string[] {
  if (!officialSolution) return []
  const found = officialSolution.match(/\d+\.\d+|\d{3,}/g) ?? []
  return [...new Set(found)]
}

/** Matches a literal number, but not one embedded in a longer number. */
function numberPattern(literal: string) {
  return new RegExp(`(?<![\\d.])${literal.replace('.', '\\.')}(?![\\d])`)
}

/**
 * A decimal also leaks when it is rounded: 23.52 in the reference becomes
 * "23.5" in the feedback. Match the shortened forms too.
 */
function variants(literal: string) {
  const forms = new Set<string>([literal])
  if (literal.includes('.')) {
    const [whole, fraction] = literal.split('.')
    for (let digits = 1; digits < fraction!.length; digits += 1) {
      forms.add(`${whole}.${fraction!.slice(0, digits)}`)
    }
    // 23.52 rounded to a whole number is still a give-away in context, but a
    // bare "23" collides with too much ordinary text to be worth matching.
  }
  return [...forms]
}

function splitSentences(text: string) {
  // Split after . ! ? only when whitespace follows, so a decimal point does not
  // end a sentence. Splitting on every period tore "23.5" into "23" and ".5",
  // and the guard then failed to recognise the number it was looking for.
  return text.split(/(?<=[.!?])(?=\s)/)
}

/**
 * Drops whole sentences that quote a revealing number, rather than blanking the
 * digits: a sentence with a hole in it reads like a bug, and the surrounding
 * explanation usually survives intact on its own.
 *
 * Returns null when nothing is left to say, so the caller can substitute a
 * neutral line instead of an empty bubble.
 */
export function redactAnswer(
  text: string | null,
  officialSolution: string | null,
): { text: string | null; redacted: boolean } {
  if (!text) return { text, redacted: false }

  const literals = revealingNumbers(officialSolution).flatMap(variants)
  if (literals.length === 0) return { text, redacted: false }

  const patterns = literals.map(numberPattern)
  const sentences = splitSentences(text)
  const kept = sentences.filter((sentence) => !patterns.some((p) => p.test(sentence)))

  if (kept.length === sentences.length) return { text, redacted: false }

  const remaining = kept.join('').trim()
  return { text: remaining || null, redacted: true }
}
