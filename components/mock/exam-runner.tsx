'use client'

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AlarmClock, Loader2, Send } from 'lucide-react'
import { submitMock } from '@/app/(app)/mock/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { DifficultyStars } from '@/components/difficulty-stars'
import { createDraftStore } from '@/lib/session-draft'
import { cardClass, cn } from '@/lib/utils'
import type { MockPaper } from '@/lib/supabase/queries'
import { useT } from '@/components/i18n-provider'

const MIN_ANSWER_LENGTH = 20

type Answers = Record<string, string>

function formatClock(seconds: number) {
  const safe = Math.max(0, seconds)
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/**
 * The exam itself.
 *
 * No hints and no Sulu while the clock runs: a paper you can ask for help on
 * measures the help, not the student. The clock never blocks submission — it
 * runs out and the work still gets graded, because a hard cut-off loses honest
 * effort to a slow connection.
 */
export function ExamRunner({
  paper,
  statements,
}: {
  paper: MockPaper
  /** Each question's statement, typeset on the server (components/math-text.tsx). */
  statements: Record<string, ReactNode>
}) {
  const t = useT()

  const router = useRouter()
  const drafts = useMemo(
    () => createDraftStore<Answers>(`olympai:mock:${paper.id}`, () => ({})),
    [paper.id],
  )
  const raw = useSyncExternalStore(drafts.subscribe, drafts.read, drafts.serverRead)
  const answers = useMemo(() => drafts.parse(raw), [drafts, raw])
  const [remaining, setRemaining] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const deadline = new Date(paper.startedAt).getTime() + paper.durationMinutes * 60_000

  useEffect(() => {
    const tick = () => setRemaining(Math.round((deadline - Date.now()) / 1000))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [deadline])

  // Drafts are the source of truth, so a reload keeps every word.
  const update = useCallback(
    (taskId: string, value: string) => {
      drafts.write({ ...answers, [taskId]: value })
    },
    [answers, drafts],
  )

  const answered = paper.questions.filter(
    (question) => (answers[question.id] ?? '').trim().length >= MIN_ANSWER_LENGTH,
  ).length

  function submit() {
    setError('')
    startTransition(async () => {
      const result = await submitMock(paper.id, answers)
      if (result.ok) {
        drafts.clear()
        router.refresh()
      } else {
        setError(result.error ?? t('The paper could not be submitted.'))
      }
    })
  }

  const overtime = remaining !== null && remaining <= 0

  return (
    <div className="space-y-5">
      <div
        className={cn(
          cardClass,
          'sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 p-4 backdrop-blur',
          overtime && 'ring-warning/40',
        )}
      >
        <div className="flex items-center gap-2">
          <AlarmClock className={cn('size-4', overtime ? 'text-warning' : 'text-primary')} />
          <span className="font-semibold tabular-nums">
            {remaining === null ? '—' : overtime ? t('Time is up') : formatClock(remaining)}
          </span>
          <span className="text-sm text-muted-foreground">
            · {answered} {t('of')} {paper.questions.length} {t('answered')}
          </span>
        </div>
        <Button onClick={submit} disabled={pending || answered === 0}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {t('Grading {n} {n|answer|answers}…', { n: answered })}
            </>
          ) : (
            <>
              <Send className="size-4" /> {t('Submit paper')}
            </>
          )}
        </Button>
      </div>

      {overtime ? (
        <p className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
          {t('The time is up. You can still hand the paper in: it will be checked as a review after the paper, and it will not change your result or level.')}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-ember/60 p-3 text-sm text-destructive shadow-key">
          {error}
        </p>
      ) : null}

      <ol className="space-y-5">
        {paper.questions.map((question, index) => (
          <li key={question.id} className={cn(cardClass, 'p-5 sm:p-6')}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">
                {t('Question')} {index + 1}. {question.title}
              </h2>
              <DifficultyStars level={question.difficulty} />
            </div>

            <div className="mt-3">{statements[question.id] ?? <p className="leading-relaxed">{question.problem}</p>}</div>

            {question.given.length ? (
              <ul className="mt-3 space-y-1.5">
                {question.given.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                    <span className="font-mono text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {question.findPrompt ? (
              <p className="mt-3 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
                {question.findPrompt}
              </p>
            ) : null}

            <Textarea
              value={answers[question.id] ?? ''}
              onChange={(event) => update(question.id, event.target.value)}
              placeholder={t('Your full derivation…')}
              className="mt-4 min-h-40 resize-y font-mono text-base leading-relaxed"
            />
          </li>
        ))}
      </ol>

      <div className="flex justify-end">
        <Button size="lg" onClick={submit} disabled={pending || answered === 0}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {t('Grading…')}
            </>
          ) : (
            <>
              <Send className="size-4" /> {t('Submit paper')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
