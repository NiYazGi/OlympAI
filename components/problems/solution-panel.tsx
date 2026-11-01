'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Camera, CheckCircle2, FileText, Lightbulb, Loader2, PenLine, Save, Sparkles, Zap } from 'lucide-react'
import { readSolutionPhoto, submitTaskAttempt, type AttemptResult } from '@/app/(app)/tasks/actions'
import { AttemptProtocol } from '@/components/problems/attempt-protocol'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Textarea } from '@/components/ui/textarea'
import { createDraftStore } from '@/lib/session-draft'
import { useT } from '@/components/i18n-provider'
import { cardClass, cn, labelClass } from '@/lib/utils'

type Graded = Extract<AttemptResult, { ok: true }>

/** The grader's own floor, mirrored here so the rejection is not a round trip. */
const MIN_ANSWER_LENGTH = 20

export function SolutionPanel({ hints, taskId }: { hints: string[]; taskId: string }) {
  const t = useT()
  /*
   * The derivation is kept in this tab's storage as it is typed.
   *
   * The panel beside this one invites the student back to the notes mid-problem
   * — "stuck on the method? go back a step" — and until now taking that offer
   * threw away everything they had written. It survives a reload, a wrong turn
   * and the back button, and it is kept after a correct verdict too: the work
   * is the thing worth re-reading once the grader agrees with it.
   */
  const drafts = useMemo(
    () => createDraftStore<{ text: string }>(`olympai:solution:${taskId}`, () => ({ text: '' })),
    [taskId],
  )
  const raw = useSyncExternalStore(drafts.subscribe, drafts.read, drafts.serverRead)
  const solution = drafts.parse(raw).text ?? ''

  const [checking, setChecking] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
  const [result, setResult] = useState<Graded | null>(null)
  // The protocol stands where the editor was; fixing the solution brings the
  // editor back with the same text in it, and the protocol stays one click away.
  const [reviewing, setReviewing] = useState(false)
  const [hintIndex, setHintIndex] = useState(-1)
  const [error, setError] = useState('')
  const protocolRef = useRef<HTMLDivElement>(null)

  const trimmed = solution.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_ANSWER_LENGTH

  async function check() {
    if (!trimmed || trimmed.length < MIN_ANSWER_LENGTH || checking) return
    setChecking(true)
    setStartedAt(Date.now())
    setResult(null)
    setError('')
    try {
      const response = await submitTaskAttempt(taskId, solution)
      if (response.ok) {
        setResult(response)
        setReviewing(true)
      } else setError(response.error)
    } catch {
      setError(t.solve.notSubmitted)
    } finally {
      setChecking(false)
    }
  }

  // The protocol replaces a long answer, which on a phone leaves the reader at
  // its bottom. Bringing its first line into view is the whole of the welcome.
  useEffect(() => {
    if (!result || !reviewing) return
    protocolRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [result, reviewing])

  const revealed = hintIndex >= 0 ? hints.slice(0, hintIndex + 1) : []

  if (result && reviewing) {
    return (
      <div ref={protocolRef} className="flex flex-col gap-5 scroll-mt-20">
        <AttemptProtocol protocol={result.protocol} animate>
          {/* The reward lands with the verdict. Without this the XP on the
              dashboard appeared out of nowhere, disconnected from the work. */}
          {result.xpEarned > 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2">
              <Zap className="size-4 shrink-0 text-primary" />
              <span className="font-mono text-ui font-semibold text-accent-foreground tabular-nums">
                +{result.xpEarned} XP
              </span>
              <span className="text-caption text-muted-foreground">
                {result.firstSolve
                  ? t.solve.firstSolve
                  : result.repeat
                    ? t.solve.repeat
                    : t.solve.forAttempt}
              </span>
            </div>
          ) : null}
        </AttemptProtocol>

        <div className="sticky bottom-0 -mx-1 flex flex-col gap-2 bg-card px-1 pb-1 pt-2 sm:static sm:mx-0 sm:flex-row sm:flex-wrap sm:bg-transparent sm:p-0">
          <Button className="min-h-11 w-full sm:w-auto" onClick={() => setReviewing(false)}>
            <PenLine className="size-4" /> {t.solve.fix}
          </Button>
          <Button
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            nativeButton={false}
            render={
              <Link href={`/tasks/${taskId}/attempts/${result.attemptId}`}>
                <FileText className="size-4" /> {t.solve.openReview}
              </Link>
            }
          />
          <Button
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            nativeButton={false}
            render={
              <Link href="/sulu-ai">
                <Sparkles className="size-4" /> {t.solve.askSulu}
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className={labelClass}>{t.solve.yourSolution}</h2>
        <p className="mt-1 text-caption text-muted-foreground">{t.solve.explainNote}</p>
      </div>

      <NotebookPhoto
        taskId={taskId}
        onRead={(text) => {
          // Appended, never swapped in: whatever was typed already stays.
          drafts.write({ text: trimmed ? `${solution.trimEnd()}\n${text}` : text })
          setError('')
          if (result) setResult(null)
        }}
      />

      <Textarea
        value={solution}
        onChange={(event) => {
          drafts.write({ text: event.target.value })
          setError('')
          if (result) setResult(null)
        }}
        onKeyDown={(event) => {
          // The shortcut every text box that submits something should have.
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            void check()
          }
        }}
        placeholder={t.solve.placeholder}
        className="font-reading min-h-56 flex-1 resize-none px-3 py-3 text-reading sm:min-h-72"
      />

      <div className="flex min-h-4 items-center justify-between gap-3 text-caption text-muted-foreground">
        {/* Only ever says a thing that is true: the text is in this tab's
            storage, and it goes no further until it is submitted. */}
        <span className={cn('flex items-center gap-1.5', !trimmed && 'invisible')}>
          <Save className="size-3" />
          {t.solve.keptLocally}
        </span>
        {tooShort ? (
          <span className="font-mono tabular-nums">
            {t.solve.moreChars(MIN_ANSWER_LENGTH - trimmed.length)}
          </span>
        ) : null}
      </div>

      {/* While the grader reads, the protocol's place is held rather than left
          blank, and the one honest thing is said: how long it has been. A row of
          stages here would be inventing steps the grader does not report. */}
      {checking ? (
        <div className={cn(cardClass, 'disclose space-y-3 overflow-hidden p-4')} role="status">
          <div className="flex items-center gap-2 text-ui font-semibold">
            <Loader2 className="size-4 animate-spin text-primary" />
            {t.solve.checking}
            <Elapsed since={startedAt} className="ml-auto font-mono text-muted-foreground tabular-nums" />
          </div>
          <p className="text-caption text-muted-foreground">{t.solve.checkingNote}</p>
          <div className="shimmer h-3 w-full rounded bg-muted" aria-hidden />
          <div className="shimmer h-3 w-2/3 rounded bg-muted" aria-hidden />
        </div>
      ) : null}

      {result ? (
        <button
          type="button"
          onClick={() => setReviewing(true)}
          className="flex items-center gap-2 self-start rounded-lg text-ui font-semibold text-primary hover:underline"
        >
          <FileText className="size-4" />
          {t.solve.openReview}
        </button>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="disclose rounded-lg bg-destructive/10 p-3 text-ui text-destructive"
        >
          {error}
        </p>
      ) : null}

      {hints.length ? (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHintIndex((index) => Math.min(index + 1, hints.length - 1))}
            disabled={hintIndex >= hints.length - 1}
          >
            <Lightbulb className="size-3.5" />
            {hintIndex < 0 ? t.solve.showHint : t.solve.nextHint(hintIndex + 1, hints.length)}
          </Button>
          {/* Every hint so far stays on screen. Replacing the first with the
              second took away the step the second one builds on. */}
          {revealed.map((hint, index) => (
            <p
              key={hint}
              className="disclose font-reading flex gap-2 rounded-lg bg-muted/60 p-3 text-ui text-muted-foreground"
            >
              <span className="shrink-0 font-mono font-medium tabular-nums">{index + 1}.</span>
              <span>{hint}</span>
            </p>
          ))}
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-1 flex flex-col gap-2 bg-card px-1 pb-1 pt-2 sm:static sm:mx-0 sm:flex-row sm:bg-transparent sm:p-0">
        <Button
          className="min-h-11 w-full sm:w-auto"
          onClick={check}
          disabled={!trimmed || trimmed.length < MIN_ANSWER_LENGTH || checking}
        >
          {checking ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {t.solve.grading}
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" /> {t.solve.submit}
              <Kbd className="ml-1">⌘↵</Kbd>
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          nativeButton={false}
          render={
            <Link href="/sulu-ai">
              <Sparkles className="size-4" /> {t.solve.askSulu}
            </Link>
          }
        />
      </div>
    </div>
  )
}

/**
 * Seconds since the grader was asked.
 *
 * The one honest thing that can be said while an answer is being marked: how
 * long it has been. A progress bar here would be inventing a position in a
 * queue nobody is keeping.
 */
function Elapsed({ since, className }: { since: number; className?: string }) {
  const [now, setNow] = useState(since)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [since])

  const seconds = Math.max(0, Math.round((now - since) / 1000))
  return <span className={className}>{seconds}s</span>
}

/** The longest side a photo is sent at: enough for handwriting, small enough to send. */
const PHOTO_EDGE = 1600

/** Downscales in the browser, so a 12-megapixel page goes as half a megabyte. */
async function shrink(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, PHOTO_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * Solved on paper: the page is photographed (on a phone the camera opens
 * straight away), read into lines, and put in the editor. The photo stays
 * beside the text so each line can be checked against the page before
 * anything is graded.
 */
function NotebookPhoto({ taskId, onRead }: { taskId: string; onRead: (text: string) => void }) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'reading' | 'read' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function choose(file: File | undefined) {
    if (!file) return
    setState('reading')
    setMessage('')
    let image: string
    try {
      image = await shrink(file)
    } catch {
      setState('error')
      setMessage(t.solve.photoInvalid)
      return
    }
    setPreview(image)
    try {
      const response = await readSolutionPhoto(taskId, image)
      if (response.ok) {
        onRead(response.text)
        setState('read')
        setMessage(t.solve.photoRead)
      } else {
        setState('error')
        setMessage(
          {
            session: t.solve.photoSession,
            invalid: t.solve.photoInvalid,
            unreadable: t.solve.photoUnreadable,
            failed: t.solve.photoFailed,
          }[response.reason],
        )
      }
    } catch {
      setState('error')
      setMessage(t.solve.photoFailed)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-sm bg-muted p-3 ring-1 ring-border sm:flex-row sm:items-start">
      {preview ? (
        <a href={preview} target="_blank" rel="noreferrer" className="shrink-0 self-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, not an asset to optimise */}
          <img
            src={preview}
            alt={t.solve.photoAlt}
            className="h-24 w-auto max-w-40 rounded-sm object-cover ring-1 ring-border"
          />
        </a>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-caption text-pretty text-muted-foreground">{t.solve.photoHint}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={state === 'reading'}
            onClick={() => input.current?.click()}
          >
            {state === 'reading' ? <Loader2 className="animate-spin" /> : <Camera />}
            {state === 'reading' ? t.solve.photoReading : t.solve.photo}
          </Button>
          {message ? (
            <span
              role={state === 'error' ? 'alert' : 'status'}
              className={cn(
                'text-caption font-semibold text-pretty',
                state === 'error' ? 'text-destructive' : 'text-foreground',
              )}
            >
              {message}
            </span>
          ) : null}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          void choose(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </div>
  )
}
