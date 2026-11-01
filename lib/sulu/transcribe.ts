import 'server-only'

import { requestSuluJson } from '@/lib/sulu/provider'
import type { ModelImage } from '@/lib/sulu/images'

/**
 * A photographed page of a notebook, turned into the lines of an attempt.
 *
 * Olympiads are written by hand, and so are most solutions worked at home;
 * typing a derivation out again is the step students skip. This reads the
 * photo and writes the student's own lines back into the editor — copied, not
 * corrected — so the grader marks exactly what is on the page, line by line.
 * The student sees the text before it is sent and fixes any misread line.
 */
const TRANSCRIBE_SCHEMA = {
  name: 'notebook_transcription',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['readable', 'lines'],
    properties: {
      readable: { type: 'boolean' },
      lines: { type: 'array', items: { type: 'string' } },
    },
  },
} as const

function instructions(problem: string, language: 'ru' | 'en') {
  const illegible = language === 'ru' ? '[неразборчиво]' : '[illegible]'
  return [
    'You transcribe a photographed handwritten solution of an olympiad problem into plain text, so it can be graded line by line.',
    'Copy what is written, in the order it is written. Never correct a mistake, never complete a step, never add an explanation, never solve the problem yourself: a wrong line must stay wrong.',
    'One step per line: a line of the notebook, or one equation. Keep the item labels the student used (а), б), 1., …).',
    'Write all mathematics in LaTeX between $…$, for example $v_0 = \\sqrt{\\dfrac{Gm}{2l}}$. Words stay in the language the student wrote them in.',
    `Leave out crossed-out text. Where a fragment cannot be read, write ${illegible} in its place rather than guessing.`,
    'If the photo shows no handwritten solution (a blank page, a printed page, something else), set readable to false and return no lines.',
    'The problem, for context only — to tell similar symbols apart, never to fill gaps:',
    problem,
  ].join('\n')
}

export async function transcribeSolutionPhoto(
  image: string,
  problem: string,
  language: 'ru' | 'en',
): Promise<{ readable: boolean; text: string }> {
  const photo: ModelImage = { type: 'input_image', image_url: image, detail: 'high' }
  const raw = await requestSuluJson<{ readable: boolean; lines: string[] }>(
    instructions(problem, language),
    'Transcribe the solution in this photo.',
    TRANSCRIBE_SCHEMA as unknown as { name: string; schema: Record<string, unknown> },
    [photo],
  )
  const lines = (raw.lines ?? []).map((line) => line.trim()).filter(Boolean)
  return { readable: Boolean(raw.readable) && lines.length > 0, text: lines.join('\n') }
}
