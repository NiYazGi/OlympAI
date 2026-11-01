'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useT } from '@/components/i18n-provider'
import { cardClass, cn } from '@/lib/utils'

export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }

/** Marks the turns that happened in front of the student, so only those arrive. */
type Shown = ChatMessage & { fresh?: boolean }


/** Close enough to the end that new text should follow the reader down. */
const STICK_THRESHOLD_PX = 80

/**
 * The transcript is server state.
 *
 * `initialMessages` is loaded from chat_messages, and the request carries only
 * the new message plus the session id — the server rebuilds the history it
 * sends to the model. The previous version posted the whole transcript from the
 * browser, so a client could hand the model an assistant turn it never wrote.
 *
 * Two rules about the scroll, both of them about who is in charge: new text
 * follows the reader down only while they are already at the end, and a reader
 * who has scrolled up to re-read something is left exactly where they are,
 * with a button to come back.
 */
export function CoachChat({
  sessionId: initialSessionId,
  initialMessages = [],
  taskId,
}: {
  sessionId?: string
  initialMessages?: ChatMessage[]
  taskId?: string
}) {
  const t = useT()
  const prompts = t.sulu.prompts
  const [messages, setMessages] = useState<Shown[]>(initialMessages)
  const [input, setInput] = useState('')
  const [lastMessage, setLastMessage] = useState('')
  const [sessionId, setSessionId] = useState(initialSessionId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  /** Whether pressing Retry could change the outcome. See the 503 note below. */
  const [retryable, setRetryable] = useState(true)
  const [atEnd, setAtEnd] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const atEndRef = useRef(true)

  function toEnd(behavior: ScrollBehavior) {
    const node = scrollRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior })
  }

  useEffect(() => {
    // `auto` rather than `smooth`: a streaming reply arrives in dozens of
    // chunks, and a smooth scroll restarted on each one never catches up.
    if (atEndRef.current) toEnd(loading ? 'auto' : 'smooth')
  }, [messages, loading])

  function onScroll() {
    const node = scrollRef.current
    if (!node) return
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight
    atEndRef.current = distance < STICK_THRESHOLD_PX
    setAtEnd(atEndRef.current)
  }

  async function send(raw: string) {
    const message = raw.trim()
    if (!message || loading) return

    setLastMessage(message)
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', content: message, fresh: true },
    ])
    setInput('')
    setError('')
    setLoading(true)
    setRetryable(true)
    // A message you just sent always pulls the transcript to the end.
    atEndRef.current = true
    setAtEnd(true)

    try {
      const response = await fetch('/api/sulu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId, taskId }),
      })
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        // 503 is this app's code for "the server is misconfigured". Pressing
        // Retry against one of those is a loop that cannot close, so the
        // button is withheld rather than offered.
        setRetryable(response.status !== 503)
        throw new Error(payload?.error ?? t.sulu.noResponse)
      }

      setSessionId(response.headers.get('X-Sulu-Session') ?? sessionId)
      const assistantId = crypto.randomUUID()
      setMessages((current) => [
        ...current,
        { id: assistantId, role: 'assistant', content: '', fresh: true },
      ])

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId ? { ...item, content: item.content + chunk } : item,
          ),
        )
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.sulu.unavailable)
      // Drop the empty assistant bubble, but keep the user's message so Retry
      // has something to resend.
      setMessages((current) => current.filter((item) => item.content))
    } finally {
      setLoading(false)
    }
  }

  const lastId = messages[messages.length - 1]?.id

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full space-y-4 overflow-y-auto px-1 py-2"
        >
          {messages.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
                <Sparkles className="size-6" />
              </div>
              <h2 className="mt-4 font-semibold">{t.sulu.startTitle}</h2>
              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                {t.sulu.startBody}
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const streaming = loading && message.role === 'assistant' && message.id === lastId
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                    // Only turns from this session arrive; a transcript loaded
                    // from the database is where the reader left it.
                    message.fresh && 'rise',
                  )}
                >
                  <div
                    className={cn(
                      'font-reading max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6',
                      message.role === 'user'
                        ? 'rounded-br-sm bg-primary text-primary-foreground'
                        : `${cardClass} rounded-bl-sm`,
                      // A caret at the end of the text that is still being
                      // written, so a pause reads as thinking rather than as
                      // finished.
                      streaming && message.content && 'stream-caret',
                    )}
                  >
                    {message.content || (streaming ? <TypingDots label={t.sulu.writingAria} /> : '')}
                  </div>
                </div>
              )
            })
          )}

          {/* The gap between sending and the first token of the reply, which was
            a blank pause with nothing to say it was working. */}
          {loading && messages[messages.length - 1]?.role === 'user' ? (
            <div className="flex justify-start">
              <div className={cn(cardClass, 'rounded-2xl rounded-bl-sm px-4 py-3')}>
                <TypingDots label={t.sulu.writingAria} />
              </div>
            </div>
          ) : null}
        </div>

        {/* Back to the end, for a reader who went up to check something. */}
        {!atEnd && messages.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              atEndRef.current = true
              setAtEnd(true)
              toEnd('smooth')
            }}
            className="disclose absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg"
          >
            <ArrowDown className="size-3.5" />
            Latest
          </button>
        ) : null}
      </div>

      {error ? (
        <div
          className="disclose mb-2 flex items-center justify-between gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{error}</span>
          {retryable ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => send(lastMessage)}
              disabled={!lastMessage || loading}
            >
              <RotateCcw className="size-3.5" /> {t.sulu.retry}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="shrink-0 space-y-3 border-t border-border/70 bg-background pt-3 pb-[max(.25rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2 overflow-x-auto">
          {prompts.map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              className="min-h-10 shrink-0 rounded-full text-xs"
              onClick={() => send(prompt)}
              disabled={loading}
            >
              {prompt}
            </Button>
          ))}
        </div>
        <div className={cn(cardClass, 'flex items-end gap-2 p-2')}>
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                send(input)
              }
            }}
            placeholder={t.sulu.placeholder}
            aria-label={t.sulu.messageAria}
            // Grows with what is typed and then scrolls, rather than pushing
            // the transcript off the top of the screen.
            className="max-h-40 min-h-12 resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            rows={1}
          />
          <Button
            size="icon-lg"
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            aria-label={t.sulu.sendAria}
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Sulu is composing. Three dots say it without claiming anything else. */
function TypingDots({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1 py-1" role="status" aria-label={label}>
      <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
      <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
      <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
    </span>
  )
}
