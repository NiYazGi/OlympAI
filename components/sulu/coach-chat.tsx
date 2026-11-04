'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowUp, FileText, RotateCcw } from 'lucide-react'
import { SuluGlyph } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cardClass, cn } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'
import { RichMessage } from '@/components/sulu/rich-message'
import { readDraft, subscribeDraft } from '@/lib/task-draft'

export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }

const prompts = ['Give me a hint', 'Explain the key idea', 'Check my approach']

/**
 * The transcript is server state.
 *
 * `initialMessages` is loaded from chat_messages, and the request carries only
 * the new message plus the session id — the server rebuilds the history it
 * sends to the model. The previous version posted the whole transcript from the
 * browser, so a client could hand the model an assistant turn it never wrote.
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

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [lastMessage, setLastMessage] = useState('')
  const [sessionId, setSessionId] = useState(initialSessionId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  // The solution editor's text, for a chat tied to a task. Attached to each
  // message unless the student switches it off, so "Check my approach" works on
  // what is actually written instead of asking for it again.
  const subscribe = useCallback(
    (onChange: () => void) => (taskId ? subscribeDraft(taskId, onChange) : () => {}),
    [taskId],
  )
  const draft = useSyncExternalStore(subscribe, () => (taskId ? readDraft(taskId) : ''), () => '')
  const [attachDraft, setAttachDraft] = useState(true)
  const sendsDraft = Boolean(taskId && attachDraft && draft.trim())

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send(raw: string) {
    const message = raw.trim()
    if (!message || loading) return

    const attached = sendsDraft ? draft.trim() : ''
    setLastMessage(message)
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: attached ? `${message}\n\n<student_draft>\n${attached}\n</student_draft>` : message,
      },
    ])
    setInput('')
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/sulu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId, taskId, draft: attached || undefined }),
      })
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? t('Sulu AI could not respond.'))
      }

      setSessionId(response.headers.get('X-Sulu-Session') ?? sessionId)
      const assistantId = crypto.randomUUID()
      setMessages((current) => [...current, { id: assistantId, role: 'assistant', content: '' }])

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
      setError(cause instanceof Error ? cause.message : t('Sulu AI is unavailable.'))
      // Drop the empty assistant bubble, but keep the user's message so Retry
      // has something to resend.
      setMessages((current) => current.filter((item) => item.content))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-card shadow-key">
              <SuluGlyph className="size-7" />
            </div>
            <h2 className="mt-4 font-medium text-white">{t('Start a focused conversation')}</h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              {t('Show Sulu what you have tried, or ask for one small hint.')}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'rise min-w-0 max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[85%]',
                  message.role === 'user'
                    ? 'rounded-br-md bg-mist text-[#1b1c1e]'
                    : 'rounded-bl-md bg-white/[0.05] text-white/90 shadow-key',
                )}
              >
                {message.content ? (
                  <RichMessage content={message.content} role={message.role} />
                ) : loading ? (
                  <span className="text-shimmer">{t('Thinking…')}</span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {error ? (
        <div
          className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-ember/60 p-3 text-sm text-[#ffb3b3] shadow-key"
          role="alert"
        >
          <span>{error}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => send(lastMessage)}
            disabled={!lastMessage || loading}
          >
            <RotateCcw className="size-3.5" /> {t('Retry')}
          </Button>
        </div>
      ) : null}

      <div className="shrink-0 space-y-3 border-t border-white/[0.06] pt-3 pb-[max(.25rem,env(safe-area-inset-bottom))]">
        {taskId && draft.trim() ? (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={attachDraft}
              onChange={(event) => setAttachDraft(event.target.checked)}
              className="accent-coral"
            />
            <FileText className="size-3.5" />
            {t('Sulu sees your draft ({n} {n|line|lines})', { n: draft.trim().split('\n').length })}
          </label>
        ) : null}
        <div className="flex gap-2 overflow-x-auto">
          {prompts.map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              className="min-h-10 shrink-0 rounded-full text-xs"
              onClick={() => send(t(prompt))}
              disabled={loading}
            >
              {t(prompt)}
            </Button>
          ))}
        </div>
        <div className="flex items-end gap-2 rounded-2xl bg-ink p-2 shadow-key-strong transition-shadow focus-within:shadow-[rgba(255,255,255,0.08)_0_1px_0_inset,rgba(255,255,255,0.25)_0_0_0_1px]">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                send(input)
              }
            }}
            placeholder={t('Ask Sulu about your approach…')}
            aria-label={t('Message Sulu AI')}
            className="min-h-12 resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            rows={1}
          />
          <Button
            size="icon-lg"
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            aria-label={t('Send message')}
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
