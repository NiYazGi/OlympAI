import 'server-only'

import { getSessionUserId } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseEnv } from '@/lib/supabase/env'

import type { ChatSessionSummary, StoredMessage } from '@/lib/types'

export type { ChatSessionSummary, StoredMessage } from '@/lib/types'

const MAX_SESSIONS = 20
const MAX_MESSAGES = 100

/**
 * Sulu conversations were written to chat_sessions and chat_messages from the
 * first commit and never read back: the sidebar listed three hard-coded
 * conversations and every reload started an empty thread.
 */
export async function getChatSessions(): Promise<ChatSessionSummary[]> {
  if (!hasSupabaseEnv()) return []
  const userId = await getSessionUserId()
  if (!userId) return []

  const supabase = await createClient()
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_SESSIONS)
  if (!sessions?.length) return []

  // One extra round trip beats N queries for the previews.
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('session_id, content, created_at')
    .in(
      'session_id',
      sessions.map((session) => session.id),
    )
    .order('created_at', { ascending: false })

  const latest = new Map<string, { content: string; created_at: string }>()
  for (const message of messages ?? []) {
    if (!latest.has(message.session_id)) {
      latest.set(message.session_id, { content: message.content, created_at: message.created_at })
    }
  }

  return sessions.map((session) => {
    const last = latest.get(session.id)
    return {
      id: session.id,
      title: session.title,
      createdAt: session.created_at,
      lastMessageAt: last?.created_at ?? null,
      preview: last ? last.content.replace(/\s+/g, ' ').slice(0, 80) : null,
    }
  })
}

export async function getChatMessages(sessionId: string): Promise<StoredMessage[]> {
  if (!hasSupabaseEnv()) return []
  const userId = await getSessionUserId()
  if (!userId) return []

  const supabase = await createClient()
  // RLS already scopes messages through session ownership; the explicit check
  // turns "someone else's id" into an empty thread instead of a silent read.
  const { data: owned } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!owned) return []

  const { data } = await supabase
    .from('chat_messages')
    .select('id, role, content')
    .eq('session_id', sessionId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })
    .limit(MAX_MESSAGES)

  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
  }))
}
