import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkChatRateLimit } from '@/lib/rate-limit'
import { buildCoachInstructions, type CoachContext } from '@/lib/sulu/prompt'
import { SuluError, streamSuluResponse, type SuluMessage } from '@/lib/sulu/provider'

export const runtime = 'nodejs'

const MAX_MESSAGE_LENGTH = 4_000
const HISTORY_TURNS = 10

type RequestBody = { message?: unknown; sessionId?: unknown; taskId?: unknown }

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request) {
  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return fail('Malformed request body.', 400)
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return fail('A message is required.', 400)
  if (message.length > MAX_MESSAGE_LENGTH) {
    return fail(`Please keep your message under ${MAX_MESSAGE_LENGTH.toLocaleString('en')} characters.`, 400)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail('Authentication is required.', 401)

  const limit = await checkChatRateLimit(supabase)
  if (!limit.allowed) return fail(limit.message, 429)

  // The coaching context is assembled here, from the database and the caller's
  // own profile. It used to arrive in the request body and land verbatim in the
  // system instructions, which let a client rewrite Sulu's rules.
  const { data: profile } = await supabase
    .from('profiles')
    .select('level')
    .eq('id', user.id)
    .maybeSingle()

  const context: CoachContext = { studentLevel: profile?.level ?? null }

  const taskId = typeof body.taskId === 'string' ? body.taskId : null
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
    }
  }

  // Resolve the session. An id supplied by the client is only accepted after
  // confirming the caller owns it.
  let sessionId: string
  if (typeof body.sessionId === 'string' && body.sessionId) {
    const { data: owned } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', body.sessionId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!owned) return fail('Chat session not found.', 404)
    sessionId = owned.id
  } else {
    const { data: created, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, title: message.slice(0, 72) })
      .select('id')
      .single()
    if (error || !created) return fail('Unable to create chat session.', 500)
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
    { role: 'user', content: message },
  ]

  let upstream: ReadableStream<Uint8Array>
  try {
    upstream = await streamSuluResponse(buildCoachInstructions(context), history)
  } catch (cause) {
    // The provider never answered, so nothing is persisted: the previous
    // version had already written the user's message and left it orphaned.
    if (cause instanceof SuluError) return fail(cause.message, cause.status)
    return fail('Sulu AI is unavailable.', 502)
  }

  const { error: userInsertError } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, role: 'user', content: message })
  if (userInsertError) return fail('Unable to save your message.', 500)

  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let answer = ''
  let persisted = false

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
              const event = JSON.parse(line.slice(6)) as { type?: string; delta?: string }
              if (event.type === 'response.output_text.delta' && event.delta) {
                answer += event.delta
                controller.enqueue(encoder.encode(event.delta))
              }
            } catch {
              // Non-JSON SSE control lines ("data: [DONE]") are expected.
            }
          }
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
