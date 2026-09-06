/**
 * Shared between the server-side grader and the client components that render
 * its result. Kept out of grade.ts so a `'use client'` file never has to import
 * a module marked `server-only`, even for a type.
 */
export type Verdict = 'correct' | 'partially_correct' | 'incorrect' | 'not_an_attempt'

export const VERDICTS: Verdict[] = [
  'correct',
  'partially_correct',
  'incorrect',
  'not_an_attempt',
]
