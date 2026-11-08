import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkChatRateLimit } from '@/lib/rate-limit'
import { SuluError } from '@/lib/sulu/provider'
import { LOCALE_NAMES_EN } from '@/lib/i18n/config'
import { getLocale, getT } from '@/lib/i18n/server'
import { ACTION_TEXT, TUTOR_ACTIONS, type TutorAction, type TutorMeta } from '@/lib/opora/ladder'
import { loadTutorTask, runTurn } from '@/lib/opora/tutor'

export const runtime = 'nodejs'

const MAX_MESSAGE_LENGTH = 4_000
const MAX_DRAFT_LENGTH = 8_000

type RequestBody = { action?: unknown; message?: unknown; sessionId?: unknown; taskId?: unknown; draft?: unknown }

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Opora's endpoint for a conversation about one problem. The page sends the
 * problem id, the conversation id, what was pressed or typed and the student's
 * current work; everything else — statement, card, memory, history — is looked
 * up here.
 */
export async function POST(request: Request) {
  const t = await getT()
  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return fail(t('Malformed request body.'), 400)
  }

  const action: TutorAction = TUTOR_ACTIONS.includes(body.action as TutorAction) ? (body.action as TutorAction) : 'ask'
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (action === 'ask' && !message) return fail(t('A message is required.'), 400)
  if (message.length > MAX_MESSAGE_LENGTH) {
    return fail(t('Please keep your message under {n} characters.', { n: MAX_MESSAGE_LENGTH }), 400)
  }
  const draft = typeof body.draft === 'string' ? body.draft.trim().slice(0, MAX_DRAFT_LENGTH) : ''

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(t('Authentication is required.'), 401)

  const limit = await checkChatRateLimit(supabase)
  if (!limit.allowed) return fail(t(limit.message, limit.vars), 429)

  let sessionId: string | null = null
  let taskId = typeof body.taskId === 'string' ? body.taskId : null
  if (typeof body.sessionId === 'string' && body.sessionId) {
    const { data: owned } = await supabase
      .from('chat_sessions')
      .select('id, task_id')
      .eq('id', body.sessionId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!owned) return fail(t('Chat session not found.'), 404)
    sessionId = owned.id
    taskId = owned.task_id ?? taskId
  }
  if (!taskId) return fail(t('This task is unavailable. Please return to the task library.'), 400)

  // Read as the student first: a hidden problem, or another class's, is not theirs to ask about.
  const { data: visible } = await supabase.from('tasks').select('id').eq('id', taskId).maybeSingle()
  const task = visible ? await loadTutorTask(taskId) : null
  if (!task) return fail(t('This task is unavailable. Please return to the task library.'), 404)

  const shown = action === 'ask' ? message : t(ACTION_TEXT[action])
  if (!sessionId) {
    const { data: created, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, title: `${task.title}`.slice(0, 72), task_id: task.id })
      .select('id')
      .single()
    if (error || !created) return fail(t('Unable to create chat session.'), 500)
    sessionId = created.id
  }

  let turn
  try {
    turn = await runTurn({
      userId: user.id,
      sessionId,
      task,
      action,
      message,
      draft,
      language: LOCALE_NAMES_EN[await getLocale()],
      labels: {
        steps: t('Solution, step by step'),
        answer: t('Answer:'),
        fallback: t('Look again at what the problem asks for and which quantities are given. Which relation connects them? Write down your first step and I will check it.'),
      },
    })
  } catch (cause) {
    if (cause instanceof SuluError) return fail(t(cause.message), cause.status)
    console.error('[opora]', cause)
    return fail(t('Sulu AI is unavailable.'), 502)
  }

  const content = draft ? `${shown}\n\n<student_draft>\n${draft}\n</student_draft>` : shown
  const meta: TutorMeta = { level: turn.level, source: turn.source, guarded: turn.guarded, action }
  const { error: saveError } = await supabase.from('chat_messages').insert({ session_id: sessionId, role: 'user', content, meta: { action } })
  if (saveError) return fail(t('Unable to save your message.'), 500)
  await supabase.from('chat_messages').insert({ session_id: sessionId, role: 'assistant', content: turn.reply, meta })

  return NextResponse.json({ sessionId, reply: turn.reply, meta, userContent: content })
}
