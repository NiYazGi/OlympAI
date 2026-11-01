'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react'
import { ArrowLeft, ArrowRight, Check, Pencil } from 'lucide-react'
import { completeOnboarding } from '@/app/onboarding/actions'
import { PROFILE_OPTIONS, isOptional, type ProfileField } from '@/lib/profile-options'
import {
  clearAnswers,
  parseAnswers,
  readSnapshot,
  serverSnapshot,
  subscribe,
  writeAnswers,
  type Answers,
} from '@/components/onboarding-storage'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import { cn } from '@/lib/utils'

/**
 * The order of the questions, and which of them needs two columns. The wording
 * lives in the dictionary: a step is a field and a layout hint, not a string.
 */
type Step = { key: ProfileField; wide?: boolean }

const steps: Step[] = [
  { key: 'grade' },
  { key: 'primary_subject', wide: true },
  { key: 'level' },
  { key: 'goal' },
  { key: 'target_competition_type' },
  { key: 'training_intensity' },
]

/** Long enough to see the tick land, short enough not to feel like a wait. */
const ADVANCE_DELAY_MS = 260

const REVIEW = steps.length

function firstUnanswered(answers: Answers) {
  const index = steps.findIndex((step) => !answers[step.key] && !isOptional(step.key))
  return index === -1 ? REVIEW : index
}

export function OnboardingFlow({ next }: { next?: string }) {
  const raw = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot)
  const answers = useMemo(() => parseAnswers(raw), [raw])

  /*
   * Where to stand. Until the student navigates, the step is derived from the
   * stored answers, so a reload resumes at the first unanswered question
   * instead of starting over. The moment they act, `visited` pins the position
   * and takes over.
   *
   * useSyncExternalStore renders the server snapshot during hydration and
   * re-renders with the real one straight after, so reading storage here does
   * not cause a mismatch.
   */
  const [visited, setVisited] = useState<number | null>(null)
  const step = visited ?? firstUnanswered(answers)

  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const t = useT()
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    },
    [],
  )

  // Move focus to each new question so it is announced and the shortcuts stay live.
  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const isReview = step === REVIEW
  const current = isReview ? null : steps[step]!
  const options = useMemo<readonly string[]>(
    () => (current ? PROFILE_OPTIONS[current.key] : []),
    [current],
  )
  const choice = current ? answers[current.key] : undefined

  const goTo = useCallback((next: number) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setError('')
    setVisited(next)
  }, [])

  const submit = useCallback(() => {
    setError('')
    const formData = new FormData()
    for (const [field, value] of Object.entries(answers)) {
      if (value) formData.set(field, value)
    }
    if (next) formData.set('next', next)
    startTransition(async () => {
      const result = await completeOnboarding(formData)
      if (result.ok) clearAnswers()
      else setError(result.error ?? t.onboarding.saveFailed)
    })
  }, [answers, next, t])

  /** Selecting answers the question and moves on: one action instead of two. */
  const select = useCallback(
    (option: string) => {
      if (!current || pending) return
      writeAnswers({ ...answers, [current.key]: option })
      setError('')
      // Pin the current step first: otherwise the freshly written answer would
      // make the derived step jump ahead instantly and swallow the tick.
      setVisited(step)
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      const next = step + 1
      advanceTimer.current = setTimeout(() => setVisited(next), ADVANCE_DELAY_MS)
    },
    [answers, current, pending, step],
  )

  const skip = useCallback(() => {
    if (!current) return
    const next = { ...answers }
    delete next[current.key]
    writeAnswers(next)
    goTo(step + 1)
  }, [answers, current, goTo, step])

  // Number keys pick an option, Enter moves on, Backspace goes back.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      if (event.key === 'Backspace' && step > 0) {
        event.preventDefault()
        goTo(step - 1)
        return
      }
      if (isReview) {
        if (event.key === 'Enter' && !pending) {
          event.preventDefault()
          submit()
        }
        return
      }
      const index = Number(event.key)
      if (Number.isInteger(index) && index >= 1 && index <= options.length) {
        event.preventDefault()
        select(options[index - 1]!)
        return
      }
      if (event.key === 'Enter' && choice) {
        event.preventDefault()
        goTo(step + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choice, goTo, isReview, options, pending, select, step, submit])

  const answeredCount = steps.filter((entry) => answers[entry.key]).length
  const progress = isReview ? 100 : Math.round((step / steps.length) * 100)

  return (
    <main className="min-h-dvh px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-xl flex-col">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold">
            Olymp<span className="text-primary">AI</span>
          </Link>
          <span className="text-sm text-muted-foreground">
            {isReview ? t.onboarding.review : t.onboarding.stepOf(step + 1, steps.length)}
          </span>
        </div>

        <div
          className="mt-6 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t.onboarding.progressAria}
        >
          <div
            className="meter-fill h-full bg-primary"
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>

        <div className="my-auto py-8 sm:py-12">
          {isReview ? (
            <ReviewStep answers={answers} answeredCount={answeredCount} onEdit={goTo} t={t} />
          ) : (
            <>
              <p className="text-caption font-semibold text-primary">
                {t.onboarding.steps[current!.key]!.eyebrow}
              </p>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-display mt-3 text-2xl leading-[1.2] font-bold tracking-[-0.03em] outline-none sm:text-3xl"
              >
                {t.onboarding.steps[current!.key]!.title}
              </h1>
              <p className="mt-3 text-muted-foreground">
                {t.onboarding.steps[current!.key]!.description}
              </p>

              <div className={cn('mt-7 grid gap-3', current!.wide && 'sm:grid-cols-2')}>
                {options.map((option, index) => {
                  const active = choice === option
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={active}
                      onClick={() => select(option)}
                      className={cn(
                        'flex min-h-14 items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all',
                        active
                          ? 'border-primary bg-accent/60 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/40 hover:bg-accent/40',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums',
                          active
                            ? 'border-primary bg-primary text-white'
                            : 'border-border text-muted-foreground',
                        )}
                      >
                        {active ? <Check className="size-3" /> : index + 1}
                      </span>
                      <span className="font-medium">
                        {t.subjects[option] ?? t.options[option] ?? option}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-7 flex items-center gap-3">
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => goTo(Math.max(0, step - 1))}
              disabled={step === 0 || pending}
            >
              <ArrowLeft className="size-4" /> {t.onboarding.back}
            </Button>

            {isReview ? (
              <Button className="min-h-11 flex-1" onClick={submit} disabled={pending}>
                {pending ? `${t.common.saving}…` : t.onboarding.startTraining}{' '}
                <ArrowRight className="size-4" />
              </Button>
            ) : isOptional(current!.key) && !choice ? (
              <Button variant="ghost" className="min-h-11 flex-1" onClick={skip}>
                {t.onboarding.skipQuestion} <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button className="min-h-11 flex-1" onClick={() => goTo(step + 1)} disabled={!choice}>
                {t.onboarding.continue} <ArrowRight className="size-4" />
              </Button>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {isReview ? t.onboarding.enterToFinish : t.onboarding.keyHints}
          </p>
        </div>
      </div>
    </main>
  )
}

function ReviewStep({
  answers,
  answeredCount,
  onEdit,
  t,
}: {
  answers: Answers
  answeredCount: number
  onEdit: (index: number) => void
  t: Dictionary
}) {
  return (
    <>
      <p className="text-caption font-semibold text-primary">{t.onboarding.almostThere}</p>
      <h1 className="font-display mt-3 text-2xl leading-[1.2] font-bold tracking-[-0.03em] sm:text-3xl">
        {t.onboarding.looksRight}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {t.onboarding.answeredOf(answeredCount, steps.length)}
      </p>

      <dl className="mt-7 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {steps.map((entry, index) => {
          const value = answers[entry.key]
          return (
            <div key={entry.key} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <dt className="text-caption font-semibold text-muted-foreground">
                  {t.onboarding.labels[entry.key]}
                </dt>
                <dd
                  className={cn(
                    'mt-0.5 truncate font-medium',
                    !value && 'font-normal italic text-muted-foreground',
                  )}
                >
                  {value ? (t.subjects[value] ?? t.options[value] ?? value) : t.onboarding.skipped}
                </dd>
              </div>
              <button
                type="button"
                onClick={() => onEdit(index)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent"
              >
                <Pencil className="size-3.5" />
                {t.onboarding.change}
              </button>
            </div>
          )
        })}
      </dl>
    </>
  )
}
