import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkChatRateLimit } from '@/lib/rate-limit'
import { buildCoachInstructions, type CoachContext } from '@/lib/sulu/prompt'
import { SuluError, streamSuluResponse, type SuluMessage } from '@/lib/sulu/provider'
import { getPrompt } from '@/lib/ai/prompts'
import { identityScrubber } from '@/lib/ai/identity'
import { recordUsage } from '@/lib/opora/usage'
import { LOCALE_NAMES_EN } from '@/lib/i18n/config'
import { getLocale, getT } from '@/lib/i18n/server'

export const runtime = 'nodejs'

const MAX_MESSAGE_LENGTH = 4_000
const MAX_DRAFT_LENGTH = 8_000
const HISTORY_TURNS = 10

type RequestBody = { message?: unknown; sessionId?: unknown; taskId?: unknown; draft?: unknown }

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request) {
  const t = await getT()
  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return fail(t('Malformed request body.'), 400)
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return fail(t('A message is required.'), 400)
  if (message.length > MAX_MESSAGE_LENGTH) {
    return fail(t('Please keep your message under {n} characters.', { n: MAX_MESSAGE_LENGTH }), 400)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(t('Authentication is required.'), 401)

  const limit = await checkChatRateLimit(supabase)
  if (!limit.allowed) return fail(t(limit.message, limit.vars), 429)

  // The coaching context is assembled here, from the database and the caller's
  // own profile. It used to arrive in the request body and land verbatim in the
  // system instructions, which let a client rewrite Sulu's rules.
  const { data: profile } = await supabase
    .from('profiles')
    .select('level')
    .eq('id', user.id)
    .maybeSingle()

  const context: CoachContext = { studentLevel: profile?.level ?? null }

  // Resolve the session first: a conversation started from a task keeps that
  // task's context even when it is continued from the general Sulu page.
  let sessionId: string | null = null
  let sessionTaskId: string | null = null
  if (typeof body.sessionId === 'string' && body.sessionId) {
    const { data: owned } = await supabase
      .from('chat_sessions')
      .select('id, task_id')
      .eq('id', body.sessionId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!owned) return fail(t('Chat session not found.'), 404)
    sessionId = owned.id
    sessionTaskId = owned.task_id
  }

  const taskId = sessionTaskId ?? (typeof body.taskId === 'string' ? body.taskId : null)
  let taskExists = false
  if (taskId) {
    const { data: task } = await supabase
      .from('tasks')
      .select('title, problem, difficulty, subject_id, topic_id')
      .eq('id', taskId)
      .maybeSingle()

    if (task) {
      const [{ data: subject }, { data: topic }] = await Promise.all([
        supabase.from('subjects').select('name').eq('id', task.subject_id).maybeSingle(),
        supabase.from('topics').select('name').eq('id', task.topic_id).maybeSingle(),
      ])
      context.subject = subject?.name ?? null
      context.topic = topic?.name ?? null
      context.difficulty = task.difficulty
      context.taskTitle = task.title
      context.taskStatement = task.problem
      taskExists = true

      // The latest verdict, so "check my approach" can build on what the grader
      // already said instead of contradicting it blind.
      const { data: lastAttempt } = await supabase
        .from('task_attempts')
        .select('score, feedback')
        .eq('user_id', user.id)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lastAttempt) {
        context.lastScore = lastAttempt.score
        context.lastFeedback = lastAttempt.feedback
      }
    }
  }

  // The student's current editor text, sent by "Check my approach" and any
  // message from a task. It travels with the message and is stored with it, so
  // later turns still see the version that was discussed.
  const draft = typeof body.draft === 'string' ? body.draft.trim().slice(0, MAX_DRAFT_LENGTH) : ''
  const content = draft ? `${message}\n\n<student_draft>\n${draft}\n</student_draft>` : message

  if (!sessionId) {
    const { data: created, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, title: message.slice(0, 72), task_id: taskExists ? taskId : null })
      .select('id')
      .single()
    if (error || !created) return fail(t('Unable to create chat session.'), 500)
    sessionId = created.id
  }

  // History comes from the database, not from the request. The client used to
  // send it, so it could put words in the assistant's mouth for the next turn.
  const { data: stored } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: false })
    .limit(HISTORY_TURNS)

  const history: SuluMessage[] = [
    ...(stored ?? [])
      .reverse()
      .map((row) => ({ role: row.role as 'user' | 'assistant', content: row.content })),
    { role: 'user', content },
  ]

  let upstream: ReadableStream<Uint8Array>
  let model = ''
  try {
    const opened = await streamSuluResponse(
      buildCoachInstructions(context, LOCALE_NAMES_EN[await getLocale()], await getPrompt('chat')),
      history,
    )
    upstream = opened.body
    model = opened.model
  } catch (cause) {
    // The provider never answered, so nothing is persisted: the previous
    // version had already written the user's message and left it orphaned.
    if (cause instanceof SuluError) return fail(t(cause.message), cause.status)
    return fail(t('Sulu AI is unavailable.'), 502)
  }

  const { error: userInsertError } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, role: 'user', content })
  if (userInsertError) return fail(t('Unable to save your message.'), 500)

  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let answer = ''
  let persisted = false
  const scrubber = identityScrubber()

  const persist = async () => {
    if (persisted || !answer.trim()) return
    persisted = true
    await supabase
      .from('chat_messages')
      .insert({ session_id: sessionId, role: 'assistant', content: answer })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader()
      let buffer = ''
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6)) as {
                type?: string
                delta?: string
                response?: { usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number } } }
              }
              if (event.type === 'response.output_text.delta' && event.delta) {
                // The model's name never reaches the student, even mid-stream.
                const clean = scrubber.push(event.delta)
                if (clean) {
                  answer += clean
                  controller.enqueue(encoder.encode(clean))
                }
              } else if (event.type === 'response.completed' && event.response?.usage) {
                const usage = event.response.usage
                void recordUsage({
                  userId: user.id,
                  taskId: taskExists ? taskId : null,
                  kind: 'chat',
                  source: 'model',
                  model,
                  usage: { input: usage.input_tokens ?? 0, cached: usage.input_tokens_details?.cached_tokens ?? 0, output: usage.output_tokens ?? 0 },
                })
              }
            } catch {
              // Non-JSON SSE control lines ("data: [DONE]") are expected.
            }
          }
        }
        const tail = scrubber.flush()
        if (tail) {
          answer += tail
          controller.enqueue(encoder.encode(tail))
        }
        controller.close()
      } catch {
        controller.error(new Error('The connection to Sulu AI was interrupted.'))
      } finally {
        reader.releaseLock()
        // Runs on completion, on provider error and on client disconnect, so a
        // partial reply is still saved and the thread stays coherent.
        await persist()
      }
    },
    async cancel() {
      await persist()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Sulu-Session': sessionId,
    },
  })
}
