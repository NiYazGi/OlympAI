import Link from 'next/link'
import { MessageSquarePlus, Sparkles } from 'lucide-react'
import { CoachChat, type ChatMessage } from '@/components/sulu/coach-chat'
import type { ChatSessionSummary } from '@/lib/types'
import { cn } from '@/lib/utils'

function when(value: string | null) {
  if (!value) return 'No messages yet'
  return new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

/**
 * Session switching is navigation, so the transcript is fetched on the server.
 * The list used to be three hard-coded entries and clicking one only remounted
 * an empty chat, even though every message had been saved since day one.
 */
export function SuluWorkspace({
  sessions,
  activeSessionId,
  messages,
}: {
  sessions: ChatSessionSummary[]
  activeSessionId?: string
  messages: ChatMessage[]
}) {
  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] max-w-7xl gap-6 p-3 sm:p-8 md:h-dvh">
      <aside className="hidden w-64 shrink-0 flex-col rounded-2xl border border-border bg-card p-3 lg:flex">
        <Link
          href="/sulu-ai"
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90',
          )}
        >
          <MessageSquarePlus className="size-4" /> New conversation
        </Link>

        <p className="px-2 pt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent chats
        </p>
        <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Your conversations appear here once you send a first message.
            </p>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                href={`/sulu-ai?session=${session.id}`}
                className={cn(
                  'block w-full rounded-xl px-3 py-3 text-left transition-colors',
                  session.id === activeSessionId
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted',
                )}
              >
                <p className="truncate text-sm font-medium">{session.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {session.preview ?? when(session.lastMessageAt)}
                </p>
              </Link>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="mb-3 flex flex-wrap items-center gap-3 border-b border-border pb-4 sm:mb-5 sm:pb-5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Sulu AI</h1>
            <p className="text-sm text-muted-foreground">Your olympiad reasoning partner</p>
          </div>
        </header>

        {sessions.length > 0 ? (
          <div className="mb-3 flex gap-2 overflow-x-auto lg:hidden">
            <Link
              href="/sulu-ai"
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
                activeSessionId ? 'border-border' : 'border-primary bg-primary text-white',
              )}
            >
              New
            </Link>
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/sulu-ai?session=${session.id}`}
                className={cn(
                  'shrink-0 max-w-40 truncate rounded-full border px-3 py-1.5 text-xs font-medium',
                  session.id === activeSessionId
                    ? 'border-primary bg-primary text-white'
                    : 'border-border',
                )}
              >
                {session.title}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="min-h-0 flex-1">
          {/* Remount on session change so the chat starts from the loaded transcript. */}
          <CoachChat
            key={activeSessionId ?? 'new'}
            sessionId={activeSessionId}
            initialMessages={messages}
          />
        </div>
      </section>
    </div>
  )
}
