'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowUp, BookOpenCheck, FileText, Lightbulb, ListChecks, RotateCcw, ZoomIn } from 'lucide-react'
import { SuluGlyph } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cardClass, cn } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'
import { RichMessage } from '@/components/sulu/rich-message'
import { readDraft, subscribeDraft } from '@/lib/task-draft'
import { ACTION_TEXT, LEVEL_LABEL, type Level, type TutorAction } from '@/lib/opora/ladder'
import { OPORA_HINT_EVENT } from '@/lib/opora/events'
import type { StoredMessage } from '@/lib/types'

export type ChatMessage = StoredMessage

const prompts = ['Give me a hint', 'Explain the key idea', 'Check my approach']

/** The reasons a student gets stuck, each turned into one clear question. */
const STUCK = [
  { key: 'statement', label: 'I do not understand the statement', message: 'I do not understand the statement of the problem. Help me restate what is given and what is asked, without solving it.' },
  { key: 'theory', label: 'I do not know the theory', message: 'I think I am missing the theory for this problem. Which idea or law do I need, and where should I read about it?' },
  { key: 'idea', label: 'I cannot see the idea', message: 'I understand the statement but cannot see how to start. Give me a first nudge.' },
  { key: 'algebra', label: 'I am lost in the calculation', message: 'I have a plan but got lost in the calculation. Help me find where my working goes wrong.' },
  { key: 'tired', label: 'I am tired', message: '' },
] as const

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
  const [lastAction, setLastAction] = useState<{ action: TutorAction; message: string } | null>(null)
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

  // The ladder level reached so far, read from the replies themselves.
  const reached = messages.reduce(
    (top, item) => (item.role === 'assistant' && item.meta?.level ? Math.max(top, item.meta.level) : top),
    0,
  )

  /**
   * A turn about a task goes through Opora: the server picks the card, the
   * memory and the history, and answers once — from the card or from one
   * model call.
   */
  async function ask(action: TutorAction, raw = '') {
    const message = raw.trim()
    if (loading || (action === 'ask' && !message)) return
    const attached = sendsDraft ? draft.trim() : ''
    const pendingId = crypto.randomUUID()
    setLastAction({ action, message })
    const shown = action === 'ask' ? message : t(ACTION_TEXT[action])
    setMessages((current) => [
      ...current,
      {
        id: pendingId,
        role: 'user',
        content: attached ? `${shown}\n\n<student_draft>\n${attached}\n</student_draft>` : shown,
      },
    ])
    if (action === 'ask') setInput('')
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/sulu/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, message, sessionId, taskId, draft: attached || undefined }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; sessionId?: string; reply?: string; meta?: ChatMessage['meta'] }
        | null
      if (!response.ok || !payload?.reply) throw new Error(payload?.error ?? t('Sulu AI could not respond.'))
      const reply = payload.reply
      setSessionId(payload.sessionId ?? sessionId)
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', content: reply, meta: payload.meta ?? null },
      ])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Sulu AI is unavailable.'))
      setMessages((current) => current.filter((item) => item.id !== pendingId))
    } finally {
      setLoading(false)
    }
  }

  // "Hint" in the solution panel lands here.
  const askRef = useRef(ask)
  useEffect(() => {
    askRef.current = ask
  })
  useEffect(() => {
    if (!taskId) return
    const onHint = () => {
      scrollRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      void askRef.current('hint')
    }
    window.addEventListener(OPORA_HINT_EVENT, onHint)
    return () => window.removeEventListener(OPORA_HINT_EVENT, onHint)
  }, [taskId])

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
            <SuluGlyph className="size-8" />
            <h2 className="mt-3 text-base font-semibold text-foreground">{t('Ask about a problem')}</h2>
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
                    ? 'rounded-br-md bg-primary text-primary-foreground'
                    : 'rounded-bl-md bg-foreground/[0.05] text-foreground/90 shadow-key',
                )}
              >
                {message.content ? (
                  <RichMessage content={message.content} role={message.role} />
                ) : loading ? (
                  <span className="text-shimmer">{t('Thinking…')}</span>
                ) : null}
                {message.role === 'assistant' && message.meta?.level ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t(LEVEL_LABEL[message.meta.level as Level])}
                    {message.meta.source === 'card' ? ` · ${t('verified hint')}` : ''}
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
        {taskId && loading ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-foreground/[0.05] px-4 py-3 text-sm shadow-key">
              <span className="text-shimmer">{t('Thinking…')}</span>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-ember/60 p-3 text-sm text-destructive shadow-key"
          role="alert"
        >
          <span>{error}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => (taskId && lastAction ? ask(lastAction.action, lastAction.message) : send(lastMessage))}
            disabled={(taskId ? !lastAction : !lastMessage) || loading}
          >
            <RotateCcw className="size-3.5" /> {t('Retry')}
          </Button>
        </div>
      ) : null}

      <div className="shrink-0 space-y-3 border-t border-foreground/[0.06] pt-3 pb-[max(.25rem,env(safe-area-inset-bottom))]">
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
        {taskId ? (
          <div className="space-y-2">
            <ol className="flex gap-1" aria-label={t('Hint ladder')}>
              {([1, 2, 3, 4, 5] as Level[]).map((level) => (
                <li key={level} className="min-w-0 flex-1">
                  <div className={cn('h-1 rounded-full', level <= reached ? 'bg-primary' : 'bg-foreground/[0.08]')} />
                  <p className={cn('mt-1 truncate text-[10px]', level <= reached ? 'text-foreground' : 'text-muted-foreground')}>
                    {t(LEVEL_LABEL[level])}
                  </p>
                </li>
              ))}
            </ol>
            <div className="flex gap-2 overflow-x-auto">
              <Button className="min-h-10 shrink-0 rounded-full text-xs" onClick={() => ask('hint')} disabled={loading}>
                <Lightbulb className="size-3.5" /> {reached ? t('Next hint') : t('Hint')}
              </Button>
              <Button
                variant="outline"
                className="min-h-10 shrink-0 rounded-full text-xs"
                onClick={() => ask('more')}
                disabled={loading || !reached}
              >
                <ZoomIn className="size-3.5" /> {t('More detail')}
              </Button>
              <Button
                variant="outline"
                className="min-h-10 shrink-0 rounded-full text-xs"
                onClick={() => {
                  if (window.confirm(t('Show the full solution? Try the hints first — it sticks better when you find it yourself.'))) {
                    void ask('reveal')
                  }
                }}
                disabled={loading}
              >
                <ListChecks className="size-3.5" /> {t('Solution')}
              </Button>
              <Button
                variant="outline"
                className="min-h-10 shrink-0 rounded-full text-xs"
                onClick={() => ask('check')}
                disabled={loading || reached < 3}
              >
                <BookOpenCheck className="size-3.5" /> {t('Check me')}
              </Button>
            </div>
            <details className="group text-xs">
              <summary className="w-fit cursor-pointer list-none text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                {t('Stuck? Say what is in the way')}
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {STUCK.map((reason) => (
                  <button
                    key={reason.key}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (reason.key === 'tired') {
                        // No model call: the useful answer to tiredness is a break.
                        setMessages((current) => [
                          ...current,
                          { id: crypto.randomUUID(), role: 'user', content: t(reason.label) },
                          { id: crypto.randomUUID(), role: 'assistant', content: t('Take a 10-minute break away from the screen. Your draft is saved, and the next hint will be here when you come back.') },
                        ])
                        return
                      }
                      void ask('ask', t(reason.message))
                    }}
                    className="rounded-full border border-border px-2.5 py-1 transition-colors hover:bg-secondary disabled:opacity-50"
                  >
                    {t(reason.label)}
                  </button>
                ))}
              </div>
            </details>
          </div>
        ) : (
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
        )}
        <div className="flex items-end gap-2 rounded-2xl bg-ink p-2 shadow-key-strong transition-shadow focus-within:shadow-[rgba(255,255,255,0.08)_0_1px_0_inset,rgba(255,255,255,0.25)_0_0_0_1px]">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (taskId) void ask('ask', input)
                else send(input)
              }
            }}
            placeholder={t('Ask Sulu about your approach…')}
            aria-label={t('Message Sulu AI')}
            className="min-h-12 resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            rows={1}
          />
          <Button
            size="icon-lg"
            onClick={() => (taskId ? ask('ask', input) : send(input))}
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
