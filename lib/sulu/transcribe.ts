import 'server-only'

import { requestSuluJson } from '@/lib/sulu/provider'
import { getPrompt } from '@/lib/ai/prompts'
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

function instructions(rules: string, problem: string, language: 'ru' | 'en' | 'kk') {
  const illegible = language === 'en' ? '[illegible]' : language === 'kk' ? '[оқылмайды]' : '[неразборчиво]'
  return [
    rules,
    `Illegible marker: ${illegible}`,
    'The problem, for context only — to tell similar symbols apart, never to fill gaps:',
    problem,
  ].join('\n')
}

export async function transcribeSolutionPhoto(
  image: string,
  problem: string,
  language: 'ru' | 'en' | 'kk',
): Promise<{ readable: boolean; text: string }> {
  const photo: ModelImage = { type: 'input_image', image_url: image, detail: 'high' }
  const raw = await requestSuluJson<{ readable: boolean; lines: string[] }>(
    instructions(await getPrompt('transcribe'), problem, language),
    'Transcribe the solution in this photo.',
    TRANSCRIBE_SCHEMA as unknown as { name: string; schema: Record<string, unknown> },
    [photo],
    { fast: true },
  )
  const lines = (raw.lines ?? []).map((line) => line.trim()).filter(Boolean)
  return { readable: Boolean(raw.readable) && lines.length > 0, text: lines.join('\n') }
}
