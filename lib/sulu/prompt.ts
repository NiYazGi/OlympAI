import 'server-only'

import { figuresIn, numberFigures } from '@/lib/statement-figures'

/**
 * Everything in here is assembled on the server from the database and the
 * caller's own profile.
 *
 * The previous version accepted this whole object from the request body and
 * interpolated it straight into the system instructions, so a client could
 * rewrite Sulu's rules — including "do not reveal the full solution" — by
 * sending a crafted `studentLevel`.
 */
export type CoachContext = {
  subject?: string | null
  topic?: string | null
  difficulty?: number | null
  taskTitle?: string | null
  taskStatement?: string | null
  studentLevel?: string | null
  /** The grader's latest verdict on this student's attempt at the task. */
  lastScore?: number | null
  lastFeedback?: string | null
}

/** Trim and cap any value that reaches the prompt, whatever its origin. */
function field(value: string | number | null | undefined, max = 400) {
  if (value === null || value === undefined) return 'not specified'
  const text = String(value).replace(/\s+/g, ' ').trim()
  if (!text) return 'not specified'
  return text.length > max ? `${text.slice(0, max)}…` : text
}


/**
 * The interface language the student picked. Sulu answers in it, but follows
 * the student if they write in another one.
 */
export function languageRule(language: string) {
  return `

Reply in ${language}. If the student writes in a different language, reply in theirs. Problem text may be in Russian, Kazakh or English; keep names and quoted terms as written. Use only that language's own alphabet, plus standard mathematical notation: never insert words or characters from another writing system, such as Chinese characters or English words inside a Russian sentence.`
}

/** `rules` is the chat prompt from lib/ai/prompts (the admin's version or the default). */
export function buildCoachInstructions(context: CoachContext, language: string, rules: string) {
  return `${rules}${languageRule(language)}

<learning_context>
Subject: ${field(context.subject)}
Topic: ${field(context.topic)}
Difficulty (1-5): ${field(context.difficulty)}
Task: ${field(context.taskTitle, 200)}
Problem statement: ${field(context.taskStatement ? numberFigures(context.taskStatement) : null, 2000)}
Student level: ${field(context.studentLevel, 80)}
Latest graded attempt: ${context.lastScore === null || context.lastScore === undefined ? 'none' : `${context.lastScore}/100 — ${field(context.lastFeedback, 600)}`}
</learning_context>`
}

export type GraderContext = {
  title: string
  problem: string
  given: string[]
  findPrompt: string | null
  officialSolution: string | null
  difficulty: number
  hints: string[]
  /** The figure stored beside the statement, for problems imported that way. */
  diagramUrl?: string | null
  /**
   * The language of the student's interface. Asked to answer "in the language
   * the student wrote in", the grader once answered an English attempt in
   * Spanish; told which one, it does not.
   */
  language?: 'ru' | 'en' | 'kk'
}

/**
 * The protocol a jury would write: points out of seven, one sentence, a mark
 * on every line of the attempt, the marking scheme and the first break. The
 * old shape was a verdict, a score out of 100 and a paragraph, which told a
 * student that the argument failed but not where.
 */
export const GRADE_SCHEMA = {
  name: 'attempt_protocol',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['verdict', 'points', 'summary', 'feedback', 'next_hint', 'marks', 'criteria', 'break_point'],
    properties: {
      verdict: {
        type: 'string',
        enum: ['correct', 'partially_correct', 'incorrect', 'not_an_attempt'],
        description:
          'not_an_attempt covers empty, off-topic, or nonsense submissions that contain no reasoning about this problem.',
      },
      points: {
        type: 'integer',
        minimum: 0,
        maximum: 7,
        description:
          'Out of 7, inside the band for the verdict: correct 6-7, partially_correct 3-5, incorrect 1-2, not_an_attempt 0. Equal to the sum of the points earned over the criteria.',
      },
      summary: {
        type: 'string',
        description:
          'One sentence, the jury in its own words: what holds, then the first thing that does not. Addressed to the student. It must not contain the answer.',
      },
      feedback: {
        type: 'string',
        description:
          'Two to four sentences addressed to the student. Say what holds up, then name the first thing that is wrong or missing. It must not contain the answer in any form: no final number, no closed-form expression, no rearranged version of it.',
      },
      next_hint: {
        type: ['string', 'null'],
        description:
          'One short nudge toward the next step, or null when the attempt is already complete. Same rule: it points at the step, it never states the result.',
      },
      marks: {
        type: 'array',
        description:
          'Marks on the numbered lines of the attempt, in line order. Every line is covered exactly once; a run of consecutive lines with the same judgement may share one mark.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['from_line', 'to_line', 'kind', 'note'],
          properties: {
            from_line: { type: 'integer', minimum: 1 },
            to_line: { type: 'integer', minimum: 1 },
            kind: {
              type: 'string',
              enum: ['ok', 'gap', 'error', 'strong'],
              description:
                'ok: the step holds. gap: the claim may be true but is not justified. error: the step is wrong. strong: a key idea of the solution, correctly used.',
            },
            note: {
              type: ['string', 'null'],
              description:
                'For gap, error and strong: a margin note of at most twelve words saying what is missing, what is wrong, or why it is strong. Null for ok. Never the answer.',
            },
          },
        },
      },
      criteria: {
        type: 'array',
        description:
          'The marking scheme for this problem: two to five items whose max points add up to exactly 7, each with the points this attempt earned. Follow the scheme in the reference solution when it states one.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['text', 'max', 'earned'],
          properties: {
            text: {
              type: 'string',
              description: 'What earns the points, in a few words, without the answer.',
            },
            max: { type: 'integer', minimum: 1, maximum: 7 },
            earned: { type: 'integer', minimum: 0, maximum: 7 },
          },
        },
      },
      break_point: {
        description:
          'The first line where the argument stops holding, or null when the solution is complete.',
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['line', 'need', 'technique'],
            properties: {
              line: { type: 'integer', minimum: 1 },
              need: {
                type: 'string',
                description:
                  'What has to be proved or fixed on that line, as one sentence, without the answer.',
              },
              technique: {
                type: ['string', 'null'],
                description:
                  'The idea or method that would close the gap, named in a few words, or null.',
              },
            },
          },
          { type: 'null' },
        ],
      },
    },
  },
} as const

/**
 * Figures arrive as images in the student's turn. Said here so "[Figure 1]"
 * in the statement is read as a reference to them and not as a gap.
 */
function figureNote(task: GraderContext) {
  const count = figuresIn(task.problem).length + (task.diagramUrl ? 1 : 0)
  if (!count) return ''
  return `\nFigures: the ${count === 1 ? 'figure' : `${count} figures`} for this problem ${count === 1 ? 'is' : 'are'} attached as ${count === 1 ? 'an image' : 'images'}, in the order the statement refers to them${task.diagramUrl ? ' (the last is the diagram printed with the problem)' : ''}. Read values and geometry from them; the statement alone is incomplete.`
}

/** `rules` is the grading prompt from lib/ai/prompts (the admin's version or the default). */
export function buildGraderInstructions(task: GraderContext, rules: string) {
  const officialSolution = task.officialSolution
    ? `Reference solution (for your judgement only — never quote or paraphrase it back to the student):
${task.officialSolution}`
    : 'No reference solution is stored for this task. Judge the reasoning on its own merits and say so if you cannot verify the final result.'

  return `${rules}

${task.language ? `Write every text field in ${{ ru: 'Russian', en: 'English', kk: 'Kazakh' }[task.language]}, whatever language the attempt is in.` : 'Write every text field in the language the student wrote in.'} Use only that language's own alphabet, plus standard mathematical notation: never insert words or characters from another writing system, such as Chinese characters or English words inside a Russian sentence.

<task>
Title: ${field(task.title, 200)}
Difficulty (1-5): ${task.difficulty}
Statement: ${field(numberFigures(task.problem), 2000)}${figureNote(task)}
Given: ${task.given.length ? task.given.map((item) => field(item, 200)).join(' | ') : 'not specified'}
Asked for: ${field(task.findPrompt, 400)}
${officialSolution}
</task>`
}
