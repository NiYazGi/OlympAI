'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Camera, Check, CheckCircle2, CloudOff, FileText, Lightbulb, Loader2, PenLine, Sparkles, Zap } from 'lucide-react'
import { readSolutionPhoto, submitTaskAttempt, type AttemptResult } from '@/app/(app)/tasks/actions'
import { AttemptProtocol } from '@/components/problems/attempt-protocol'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'
import { ReportIssue } from '@/components/problems/report-issue'
import { readDraft, saveDraft, subscribeDraft } from '@/lib/task-draft'
import { OPORA_HINT_EVENT } from '@/lib/opora/events'

type Graded = Extract<AttemptResult, { ok: true }>

/** The grader's own floor, mirrored here so the rejection is not a round trip. */
const MIN_ANSWER_LENGTH = 20

export function SolutionPanel({ taskId }: { taskId: string }) {
  const t = useT()

  const subscribe = useCallback((onChange: () => void) => subscribeDraft(taskId, onChange), [taskId])
  const solution = useSyncExternalStore(subscribe, () => readDraft(taskId), () => '')
  // null until the stored draft has been read, so the status line does not
  // claim a save before there was anything to save.
  const [stored, setStored] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<Graded | null>(null)
  // The protocol stands where the editor was; fixing the solution brings the
  // editor back with the same text in it, and the protocol stays one click away.
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState('')
  const protocolRef = useRef<HTMLDivElement>(null)

  const trimmed = solution.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_ANSWER_LENGTH

  // "Put back in the editor" in the attempt history writes through the same
  // store, so it lands here without any wiring between the two.
  function edit(text: string) {
    setStored(saveDraft(taskId, text))
    setError('')
    if (result) setResult(null)
  }

  async function check() {
    if (trimmed.length < MIN_ANSWER_LENGTH || checking) return
    setChecking(true)
    setResult(null)
    setError('')
    try {
      const response = await submitTaskAttempt(taskId, solution)
      if (response.ok) {
        setResult(response)
        setReviewing(true)
      } else setError(response.error)
    } catch {
      setError(t('Your attempt could not be submitted. Check your connection and try again.'))
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

  const askSulu = (
    <Button
      variant="outline"
      className="min-h-11 w-full sm:w-auto"
      nativeButton={false}
      render={
        <Link href={`/sulu-ai?task=${encodeURIComponent(taskId)}`}>
          <Sparkles className="size-4" /> {t('Ask Sulu AI')}
        </Link>
      }
    />
  )

  if (result && reviewing) {
    return (
      <div ref={protocolRef} className="flex scroll-mt-20 flex-col gap-5">
        <AttemptProtocol protocol={result.protocol} animate>
          {/* The reward lands with the verdict. Without this the XP on the
              dashboard appeared out of nowhere, disconnected from the work. */}
          {result.xpEarned > 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2">
              <Zap className="size-4 shrink-0 text-primary" />
              <span className="font-mono text-sm font-semibold text-accent-foreground tabular-nums">
                +{result.xpEarned} {t('XP')}
              </span>
              <span className="text-xs text-muted-foreground">
                {result.firstSolve
                  ? t('first solve')
                  : result.repeat
                    ? t('already solved — reduced')
                    : t('for the attempt')}
              </span>
            </div>
          ) : null}
        </AttemptProtocol>

        <ReportIssue taskId={taskId} attemptId={result.attemptId} kind="grading" />

        <div className="sticky bottom-0 -mx-1 flex flex-col gap-2 bg-card px-1 pt-2 pb-1 sm:static sm:mx-0 sm:flex-row sm:flex-wrap sm:bg-transparent sm:p-0">
          <Button className="min-h-11 w-full sm:w-auto" onClick={() => setReviewing(false)}>
            <PenLine className="size-4" /> {t('Fix the solution')}
          </Button>
          <Button
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            nativeButton={false}
            render={
              <Link href={`/tasks/${taskId}/attempts/${result.attemptId}`}>
                <FileText className="size-4" /> {t('Open the review')}
              </Link>
            }
          />
          {askSulu}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground">{t('Your solution')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('Write it the way you would for the jury: one step per line. Each line is marked, and the protocol shows where the argument breaks.')}
        </p>
      </div>

      <NotebookPhoto
        taskId={taskId}
        onRead={(text) => {
          // Appended, never swapped in: whatever was typed already stays.
          edit(trimmed ? `${solution.trimEnd()}\n${text}` : text)
        }}
      />

      <Textarea
        value={solution}
        onChange={(event) => edit(event.target.value)}
        onKeyDown={(event) => {
          // The shortcut every text box that submits something should have.
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            void check()
          }
        }}
        placeholder={t('Write your reasoning and equations here…')}
        className="min-h-56 flex-1 resize-y px-3 py-3 font-mono text-base leading-relaxed sm:min-h-72"
      />
      {stored === null ? null : (
        <p className="-mt-2 flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          {stored ? (
            <>
              <Check className="size-3" /> {t('Draft saved on this device')}
            </>
          ) : (
            <>
              <CloudOff className="size-3 text-warning" />{' '}
              {t('This browser is not letting the draft be saved — copy it somewhere before leaving the page.')}
            </>
          )}
        </p>
      )}
      {tooShort ? (
        <p className="-mt-2 text-xs text-muted-foreground">{t('Add a little more reasoning before submitting.')}</p>
      ) : null}

      {result && !reviewing ? (
        <button
          type="button"
          onClick={() => setReviewing(true)}
          className="self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t('Back to the protocol: {points} of {max}', { points: result.protocol.points, max: 7 })}
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-ember/60 p-3 text-sm text-destructive shadow-key">
          {error}
        </p>
      ) : null}

      {/* Hints come from Opora in the Sulu panel: a verified card first, the model only when needed. */}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => window.dispatchEvent(new Event(OPORA_HINT_EVENT))}
      >
        <Lightbulb className="size-3.5" /> {t('Get a hint')}
      </Button>

      <div className="sticky bottom-0 -mx-1 flex flex-col gap-2 bg-card px-1 pt-2 pb-1 sm:static sm:mx-0 sm:flex-row sm:bg-transparent sm:p-0">
        <Button
          className="min-h-11 w-full sm:w-auto"
          onClick={check}
          disabled={trimmed.length < MIN_ANSWER_LENGTH || checking}
        >
          {checking ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {t('Grading…')}
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" /> {t('Submit solution')}
              <span className="hidden font-mono text-[11px] opacity-60 pointer-fine:inline">Ctrl ↵</span>
            </>
          )}
        </Button>
        {askSulu}
      </div>
    </div>
  )
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

const PHOTO_ERRORS = {
  session: 'Your session has expired. Log in again.',
  invalid: 'That file cannot be read as a photo. Use a JPEG or PNG.',
  unreadable: 'No solution could be read in this photo. Shoot the page straight on, closer, in good light.',
  failed: 'The photo could not be read just now. Try again in a minute.',
} as const

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
      setMessage(t(PHOTO_ERRORS.invalid))
      return
    }
    setPreview(image)
    try {
      const response = await readSolutionPhoto(taskId, image)
      if (response.ok) {
        onRead(response.text)
        setState('read')
        setMessage(t('Read from the photo. Check every line against your notebook before you submit.'))
      } else {
        setState('error')
        setMessage(t(PHOTO_ERRORS[response.reason]))
      }
    } catch {
      setState('error')
      setMessage(t(PHOTO_ERRORS.failed))
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-foreground/[0.03] p-3 ring-1 ring-foreground/[0.06] sm:flex-row sm:items-start">
      {preview ? (
        <a href={preview} target="_blank" rel="noreferrer" className="shrink-0 self-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, not an asset to optimise */}
          <img
            src={preview}
            alt={t('Your notebook page')}
            className="h-24 w-auto max-w-40 rounded-lg object-cover ring-1 ring-foreground/10"
          />
        </a>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-xs text-pretty text-muted-foreground">
          {t('Solved it on paper? Photograph the page: it is read into lines here, and you check them before submitting.')}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={state === 'reading'}
            onClick={() => input.current?.click()}
          >
            {state === 'reading' ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            {state === 'reading' ? t('Reading the photo…') : t('Photo of your notebook')}
          </Button>
          {message ? (
            <span
              role={state === 'error' ? 'alert' : 'status'}
              className={cn('text-xs text-pretty', state === 'error' ? 'text-destructive' : 'text-foreground')}
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
