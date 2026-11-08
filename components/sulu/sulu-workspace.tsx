import Link from 'next/link'
import { ArrowLeft, MessageSquarePlus } from 'lucide-react'
import { SuluGlyph } from '@/components/brand-mark'
import { CoachChat, type ChatMessage } from '@/components/sulu/coach-chat'
import type { ChatSessionSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import { getLocale, getT } from '@/lib/i18n/server'
import { formatDate, type Locale, type Translate } from '@/lib/i18n/config'

function when(value: string | null, t: Translate, locale: Locale) {
  if (!value) return t('No messages yet')
  return formatDate(new Date(value), locale, { month: 'short', day: 'numeric' })
}

/**
 * Session switching is navigation, so the transcript is fetched on the server.
 * The list used to be three hard-coded entries and clicking one only remounted
 * an empty chat, even though every message had been saved since day one.
 */
export async function SuluWorkspace({
  sessions,
  activeSessionId,
  messages,
  task = null,
}: {
  sessions: ChatSessionSummary[]
  activeSessionId?: string
  messages: ChatMessage[]
  /** Set when the conversation belongs to a task; Sulu sees its statement. */
  task?: { id: string; title: string } | null
}) {
  const t = await getT()
  const locale = await getLocale()

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] max-w-7xl gap-6 p-3 sm:p-8 md:h-[calc(100dvh-5rem)]">
      <aside className="hidden w-64 shrink-0 flex-col rounded-2xl bg-card p-3 shadow-key lg:flex">
        <Link
          href="/sulu-ai"
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground shadow-button transition-colors hover:bg-primary/90',
          )}
        >
          <MessageSquarePlus className="size-4" /> {t('New conversation')}
        </Link>

        <p className="eyebrow px-2 pt-6">
          {t('Recent chats')}
        </p>
        <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {t('Your conversations appear here once you send a first message.')}
            </p>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                href={`/sulu-ai?session=${session.id}`}
                className={cn(
                  'block w-full rounded-xl px-3 py-3 text-left transition-colors',
                  session.id === activeSessionId
                    ? 'bg-secondary text-foreground'
                    : 'hover:bg-foreground/[0.04]',
                )}
              >
                <p className="truncate text-sm font-medium">{session.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {session.preview ?? when(session.lastMessageAt, t, locale)}
                </p>
              </Link>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="mb-3 flex flex-wrap items-center gap-3 border-b border-foreground/[0.06] pb-4 sm:mb-5 sm:pb-5">
          <SuluGlyph className="size-8" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{t('Sulu')}</h1>
            <p className="text-sm text-muted-foreground">{t('Your olympiad reasoning partner')}</p>
          </div>
        </header>

        {sessions.length > 0 ? (
          <div className="mb-3 flex gap-2 overflow-x-auto lg:hidden">
            <Link
              href="/sulu-ai"
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
                activeSessionId ? 'border-border' : 'border-primary bg-primary text-primary-foreground',
              )}
            >
              {t('New')}
            </Link>
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/sulu-ai?session=${session.id}`}
                className={cn(
                  'shrink-0 max-w-40 truncate rounded-full border px-3 py-1.5 text-xs font-medium',
                  session.id === activeSessionId
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border',
                )}
              >
                {session.title}
              </Link>
            ))}
          </div>
        ) : null}

        {task ? (
          <Link
            href={`/tasks/${task.id}`}
            className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{t('About the task')}</span>
            <span className="min-w-0 truncate font-medium">{task.title}</span>
          </Link>
        ) : null}

        <div className="min-h-0 flex-1">
          {/* Remount on session change so the chat starts from the loaded transcript. */}
          <CoachChat
            key={activeSessionId ?? `new-${task?.id ?? ''}`}
            sessionId={activeSessionId}
            initialMessages={messages}
            taskId={task?.id}
          />
        </div>
      </section>
    </div>
  )
}
