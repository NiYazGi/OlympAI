'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react'
import { useRouter } from 'next/navigation'
import { AlarmClock, Loader2, Save, Send } from 'lucide-react'
import { submitMock } from '@/app/(app)/mock/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { DifficultyStars } from '@/components/difficulty-stars'
import { createDraftStore } from '@/lib/session-draft'
import { useT } from '@/components/i18n-provider'
import { MathParagraphs } from '@/components/math-text'
import { cardClass, cn } from '@/lib/utils'
import type { MockPaper } from '@/lib/supabase/queries'

const MIN_ANSWER_LENGTH = 20
/** When the clock turns amber. Long enough to finish a question, not to start one. */
const WARNING_SECONDS = 5 * 60

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
 *
 * Submitting is the one irreversible thing in the app, so it asks first, and
 * the question it asks is the one that matters: how many answers are blank.
 */
export function ExamRunner({ paper }: { paper: MockPaper }) {
  const t = useT()
  const router = useRouter()
  const drafts = useMemo(
    () => createDraftStore<Answers>(`olympai:mock:${paper.id}`, () => ({})),
    [paper.id],
  )
  const raw = useSyncExternalStore(drafts.subscribe, drafts.read, drafts.serverRead)
  const answers = useMemo(() => drafts.parse(raw), [drafts, raw])
  const [remaining, setRemaining] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
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

  const isAnswered = (id: string) => (answers[id] ?? '').trim().length >= MIN_ANSWER_LENGTH
  const answered = paper.questions.filter((question) => isAnswered(question.id)).length
  const blank = paper.questions.length - answered

  function submit() {
    setError('')
    startTransition(async () => {
      try {
        const result = await submitMock(paper.id, answers)
        if (result.ok) {
          drafts.clear()
          router.refresh()
        } else {
          setConfirming(false)
          setError(result.error ?? t.exam.notSubmitted)
        }
      } catch {
        setConfirming(false)
        setError(t.common.offline)
      }
    })
  }

  const overtime = remaining !== null && remaining <= 0
  const nearlyOut = remaining !== null && remaining > 0 && remaining <= WARNING_SECONDS

  return (
    <div className="space-y-5">
      <div
        className={cn(
          cardClass,
          'sticky top-14 z-10 md:top-0 flex flex-wrap items-center justify-between gap-3 p-4 backdrop-blur',
          (overtime || nearlyOut) && 'ring-warning/40',
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex items-center gap-2">
            <AlarmClock
              className={cn('size-4', overtime || nearlyOut ? 'text-warning' : 'text-primary')}
            />
            <span
              className={cn(
                'font-semibold tabular-nums',
                (overtime || nearlyOut) && 'text-warning',
              )}
            >
              {remaining === null ? '—' : overtime ? t.exam.timeUp : formatClock(remaining)}
            </span>
          </span>

          {/* One dot per question, filled once there is an answer in it. The
              paper is long enough to lose your place in, and scrolling to find
              out what is still blank is not part of the exam. */}
          <span className="flex items-center gap-1.5">
            {paper.questions.map((question, index) => (
              <a
                key={question.id}
                href={`#question-${question.id}`}
                aria-label={t.exam.questionAria(index + 1, isAnswered(question.id))}
                className={cn(
                  'flex size-6 items-center justify-center rounded-md text-xs font-medium tabular-nums transition-colors',
                  isAnswered(question.id)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground ring-1 ring-foreground/15 hover:bg-muted',
                )}
              >
                {index + 1}
              </a>
            ))}
          </span>
        </div>

        <Button onClick={() => setConfirming(true)} disabled={pending || answered === 0}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Grading {answered} answer
              {answered === 1 ? '' : 's'}…
            </>
          ) : (
            <>
              <Send className="size-4" /> {t.exam.submitPaper}
            </>
          )}
        </Button>
      </div>

      {confirming && !pending ? (
        <div className={cn(cardClass, 'disclose space-y-3 p-4 ring-primary/30')} role="alertdialog">
          <p className="font-medium">
            {blank === 0 ? t.exam.submitAll(paper.questions.length) : t.exam.stillBlank(blank)}
          </p>
          <p className="text-sm text-muted-foreground">
            {t.exam.irreversible}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={submit}>
              <Send className="size-4" /> {t.exam.submitN(answered)}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {t.exam.keepWorking}
            </Button>
          </div>
        </div>
      ) : null}

      {pending ? (
        <div className={cn(cardClass, 'disclose flex items-start gap-3 p-4')}>
          <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium">Grading your paper</p>
            <p className="text-sm text-muted-foreground">
              Each answer is read against its reference solution, one after another, so this takes
              longer than a single problem. Leave the page open.
            </p>
          </div>
        </div>
      ) : null}

      {overtime ? (
        <p className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
          The clock has run out. You can still submit — anything written after time is recorded the
          same way.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="disclose rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <ol className="space-y-5">
        {paper.questions.map((question, index) => (
          <li
            key={question.id}
            id={`question-${question.id}`}
            className={cn(cardClass, 'scroll-mt-12 p-5 sm:p-6')}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">
                {t.exam.questionHeading(index + 1, question.title)}
              </h2>
              <DifficultyStars level={question.difficulty} />
            </div>

            <div className="mt-3 space-y-3">
              <MathParagraphs
                text={question.problem}
                className="font-reading max-w-[68ch] text-reading"
                figureAlt={t.tasks.diagramAlt(question.title)}
              />
              {/* The paper is the problem as printed, figure included: a
                  circuit question without its circuit cannot be sat. */}
              {question.diagramUrl ? (
                <figure className="overflow-hidden rounded-lg bg-white p-2 ring-1 ring-foreground/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={question.diagramUrl}
                    alt={t.tasks.diagramAlt(question.title)}
                    loading="lazy"
                    className="mx-auto h-auto max-h-[28rem] max-w-full"
                  />
                </figure>
              ) : null}
            </div>

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
              placeholder={t.exam.placeholder}
              className="mt-4 min-h-40 resize-y font-mono text-base leading-relaxed"
            />
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Said once, at the bottom, where someone about to close the tab is
            looking. It is the truth: the answers are in this tab's storage
            until the paper is submitted. */}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Save className="size-3" />
          {t.exam.keptLocally}
        </p>
        <Button size="lg" onClick={() => setConfirming(true)} disabled={pending || answered === 0}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {t.exam.grading}
            </>
          ) : (
            <>
              <Send className="size-4" /> {t.exam.submitPaper}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
