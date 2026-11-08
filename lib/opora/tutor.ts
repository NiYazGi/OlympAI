import 'server-only'

import { getDb } from '@/lib/db'
import { figuresIn, numberFigures } from '@/lib/statement-figures'
import { imagesFor } from '@/lib/sulu/images'
import { requestSuluJsonWithUsage, type SuluUsage } from '@/lib/sulu/provider'
import { getPrompt } from '@/lib/ai/prompts'
import { scrubIdentity } from '@/lib/ai/identity'
import { getCard, type TaskCard } from '@/lib/opora/cards'
import { guardReply } from '@/lib/opora/guard'
import { HINT_KEYS, targetLevel, type Level, type TutorAction } from '@/lib/opora/ladder'
import { recordUsage } from '@/lib/opora/usage'

/**
 * Opora, one turn:
 *
 *   student writes → the site loads the problem's card and the tutor's memory
 *   → a ready hint from a verified card, or ONE model call that both reads the
 *   attempt and writes the help → the reply is checked → saved → shown.
 *
 * The model is never assumed to remember anything. Each turn carries the
 * problem, the card, a few facts about this student's progress and the last
 * few messages word for word.
 */

const RECENT_MESSAGES = 6

export type TutorTask = {
  id: string
  title: string
  problem: string
  given: string[]
  findPrompt: string | null
  officialSolution: string | null
  hints: string[]
  diagramUrl: string | null
}

type State = {
  level: number
  confirmed: string | null
  difficulty: string | null
  help_given: { level: number; source: string; text: string }[]
  current_request: string | null
  certainty: string | null
  summary: string | null
}

const EMPTY_STATE: State = {
  level: 0,
  confirmed: null,
  difficulty: null,
  help_given: [],
  current_request: null,
  certainty: null,
  summary: null,
}

export async function loadTutorTask(taskId: string): Promise<TutorTask | null> {
  const db = await getDb()
  const { rows } = await db.query<{
    id: string
    title: string
    problem: string
    given: string[] | null
    find_prompt: string | null
    official_solution: string | null
    hints: string[] | null
    diagram_url: string | null
  }>('select id, title, problem, given, find_prompt, official_solution, hints, diagram_url from public.tasks where id = $1', [taskId])
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    problem: row.problem,
    given: row.given ?? [],
    findPrompt: row.find_prompt,
    officialSolution: row.official_solution,
    hints: row.hints ?? [],
    diagramUrl: row.diagram_url,
  }
}

export async function loadState(sessionId: string): Promise<State> {
  const db = await getDb()
  const { rows } = await db.query<State>(
    'select level, confirmed, difficulty, help_given, current_request, certainty, summary from public.tutor_state where session_id = $1',
    [sessionId],
  )
  const row = rows[0]
  if (!row) return { ...EMPTY_STATE }
  return { ...row, help_given: Array.isArray(row.help_given) ? row.help_given : [] }
}

/** The highest ladder level reached in a conversation, for the chat's ladder bar. */
export async function levelReached(sessionId: string) {
  return (await loadState(sessionId)).level
}


const TUTOR_SCHEMA = {
  name: 'opora_turn',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['reply', 'level', 'needs_figure', 'confirmed', 'difficulty', 'certainty', 'summary'],
    properties: {
      reply: { type: 'string', description: 'The message the student sees.' },
      level: { type: 'integer', enum: [1, 2, 3, 4, 5], description: 'The help level this reply actually gives. Not above the allowed level.' },
      needs_figure: { type: 'boolean' },
      confirmed: { type: ['string', 'null'] },
      difficulty: { type: ['string', 'null'] },
      certainty: { type: 'string', enum: ['high', 'medium', 'low'] },
      summary: { type: 'string' },
    },
  },
} as const

type ModelTurn = {
  reply: string
  level: Level
  needs_figure: boolean
  confirmed: string | null
  difficulty: string | null
  certainty: 'high' | 'medium' | 'low'
  summary: string
}

function cardBlock(card: TaskCard | null, task: TutorTask) {
  if (!card) {
    return `No card has been prepared for this problem yet. Basis: the reference solution (never quote it to the student).
${task.officialSolution ?? 'No reference solution is stored: judge the reasoning on its own merits and say so when you cannot verify a result.'}`
  }
  return `Status: ${card.status === 'verified' ? 'verified by the site' : 'draft, not yet verified: double-check it'}
Final answer (never show below level 4): ${card.finalAnswer ?? 'not stated'}
Notation:
${card.notation ?? 'not stated'}
Assumptions: ${card.assumptions ?? 'not stated'}
Key steps:
${card.keySteps.map((step, index) => `${index + 1}. ${step}`).join('\n') || 'not stated'}
Typical mistakes:
${card.mistakes.map((item) => `- ${item.mistake} → ${item.fix}`).join('\n') || 'none listed'}
Ready hints: ${Object.entries(card.hints).map(([key, text]) => `${key}: ${text}`).join(' | ') || 'none'}
Figure required: ${card.needsFigure ? 'yes' : 'no'}`
}

const ACTION_MEANING: Record<TutorAction, string> = {
  hint: 'The student pressed "Hint": give the next level of help.',
  more: 'The student pressed "Explain in more detail": expand the previous hint at the same level, more concretely.',
  reveal: 'The student asked to see the solution: lay it out step by step.',
  check: 'The student wants their understanding checked: ask one short question with a changed condition, and nothing else.',
  ask: 'The student typed a message: answer it directly.',
}

function buildInput(options: {
  task: TutorTask
  card: TaskCard | null
  state: State
  recent: { role: string; content: string }[]
  action: TutorAction
  level: Level
  message: string
  draft: string
  figures: number
  language: string
}) {
  const { task, card, state, recent, action, level, message, draft } = options
  const lastHelp = state.help_given.at(-1)
  return `<task>
Title: ${task.title}
Statement: ${numberFigures(task.problem)}
Given: ${task.given.join(' | ') || 'not specified'}
Asked for: ${task.findPrompt ?? 'not specified'}
Figures attached: ${options.figures}
</task>

<card>
${cardBlock(card, task)}
</card>

<facts>
Highest level reached so far: ${state.level || 'none'}
Last confirmed: ${state.confirmed ?? 'nothing yet'}
Stuck on: ${state.difficulty ?? 'unknown'}
Help already given: ${state.help_given.map((item) => `L${item.level}: ${item.text}`).join(' || ') || 'none'}
Certainty of the diagnosis: ${state.certainty ?? 'none'}
Summary of earlier conversation: ${state.summary ?? 'none'}
</facts>

<recent_messages>
${recent.map((row) => `${row.role === 'user' ? 'Student' : 'Tutor'}: ${row.content}`).join('\n\n') || 'none'}
</recent_messages>

<request>
${ACTION_MEANING[action]}
Allowed level: ${level}${level < 4 ? ' (no final answer)' : ''}
${lastHelp && action === 'more' ? `Previous hint: ${lastHelp.text}\n` : ''}Student's message: ${message || '(none)'}
Student's current written work: ${draft ? `\n${draft}` : '(nothing written)'}
Reply in ${options.language}; if the student writes in another language, reply in theirs.
</request>`
}

/** A walkthrough written straight from a verified card. */
function walkthroughFromCard(card: TaskCard, labels: { steps: string; answer: string }) {
  if (!card.keySteps.length) return null
  const steps = card.keySteps.map((step, index) => `${index + 1}. ${step}`).join('\n')
  return `**${labels.steps}**\n\n${steps}${card.finalAnswer ? `\n\n**${labels.answer}** ${card.finalAnswer}` : ''}`
}

/** A ready text for this level, if one exists that may be shown without the model. */
function readyText(options: { card: TaskCard | null; task: TutorTask; level: Level; labels: { steps: string; answer: string } }) {
  const { card, task, level } = options
  if (card?.status === 'verified') {
    if (level === 4) return walkthroughFromCard(card, options.labels)
    const key = HINT_KEYS[level as 1 | 2 | 3 | 5]
    if (card.hints[key]) return card.hints[key]!
  }
  // The problem's own hints are already shown to every student on the page,
  // so they are safe to serve as the first rungs.
  if ((level === 1 || level === 2) && task.hints[level - 1]) return task.hints[level - 1]!
  return null
}

export type TurnResult = { reply: string; level: Level; source: 'model' | 'card'; guarded: boolean; needsFigure: boolean }

export async function runTurn(options: {
  userId: string
  sessionId: string
  task: TutorTask
  action: TutorAction
  message: string
  draft: string
  language: string
  labels: { steps: string; answer: string; fallback: string }
}): Promise<TurnResult> {
  const { userId, sessionId, task, action, message, draft } = options
  const db = await getDb()
  const [card, state, { rows: recentDesc }] = await Promise.all([
    getCard(task.id),
    loadState(sessionId),
    db.query<{ role: string; content: string }>(
      `select role, content from public.chat_messages where session_id = $1 and role in ('user', 'assistant')
        order by created_at desc limit ${RECENT_MESSAGES}`,
      [sessionId],
    ),
  ])
  const level = targetLevel(action, state.level)

  // A ready text is enough when there is no attempt to read and no question to answer.
  const canUseCard = (action === 'hint' || action === 'reveal' || action === 'check') && !draft
  const ready = canUseCard ? readyText({ card, task, level, labels: options.labels }) : null

  let result: TurnResult
  let usage: SuluUsage | null = null
  let model: string | null = null
  let memory: Pick<State, 'confirmed' | 'difficulty' | 'certainty' | 'summary'> = state

  if (ready) {
    result = { reply: ready, level, source: 'card', guarded: false, needsFigure: false }
  } else {
    const sources = [...figuresIn(task.problem), task.diagramUrl]
    const images = await imagesFor(sources)
    const input = buildInput({
      task,
      card,
      state,
      recent: recentDesc.reverse(),
      action,
      level,
      message,
      draft,
      figures: images.length,
      language: options.language,
    })
    const response = await requestSuluJsonWithUsage<ModelTurn>(await getPrompt('tutor'), input, TUTOR_SCHEMA, images, { fast: true })
    usage = response.usage
    model = response.model
    const turn = response.data
    const used = Math.min(level, Math.max(1, turn.level || level)) as Level
    const fallback = readyText({ card, task, level: Math.min(used, 3) as Level, labels: options.labels }) ?? options.labels.fallback
    const checked = guardReply(scrubIdentity(turn.reply ?? ''), {
      level: used,
      finalAnswer: card?.finalAnswer ?? null,
      officialSolution: task.officialSolution,
      fallback,
    })
    result = { reply: checked.text, level: used, source: 'model', guarded: checked.guarded, needsFigure: turn.needs_figure }
    memory = { confirmed: turn.confirmed, difficulty: turn.difficulty, certainty: turn.certainty, summary: turn.summary }
  }

  // Memory: a few facts, not the transcript.
  const helpGiven = [
    ...state.help_given,
    { level: result.level, source: result.source, text: result.reply.replace(/\s+/g, ' ').slice(0, 240) },
  ].slice(-6)
  await db.query(
    `insert into public.tutor_state (session_id, user_id, task_id, level, confirmed, difficulty, help_given, current_request, certainty, summary, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, now())
     on conflict (session_id) do update set
       level = greatest(public.tutor_state.level, excluded.level), confirmed = excluded.confirmed, difficulty = excluded.difficulty,
       help_given = excluded.help_given, current_request = excluded.current_request, certainty = excluded.certainty,
       summary = excluded.summary, updated_at = now()`,
    [
      sessionId,
      userId,
      task.id,
      result.level,
      memory.confirmed,
      memory.difficulty,
      JSON.stringify(helpGiven),
      (message || action).slice(0, 500),
      memory.certainty === 'high' || memory.certainty === 'medium' || memory.certainty === 'low' ? memory.certainty : null,
      memory.summary,
    ],
  )

  await recordUsage({
    userId,
    taskId: task.id,
    kind: 'hint',
    source: result.source,
    level: result.level,
    model: result.source === 'model' ? model : null,
    usage,
    guarded: result.guarded,
  })

  return result
}
