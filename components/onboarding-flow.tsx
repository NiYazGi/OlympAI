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
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'
import { LanguageSwitcher } from '@/components/language-switcher'

type Step = {
  key: ProfileField
  eyebrow: string
  title: string
  description: string
  /** Two columns once the list is long enough to scroll on a laptop. */
  wide?: boolean
}

const steps: Step[] = [
  {
    key: 'grade',
    eyebrow: 'Quick setup',
    title: 'What grade are you in?',
    description: 'This sets an appropriate starting point.',
  },
  {
    key: 'primary_subject',
    eyebrow: 'Your focus',
    title: 'Choose your primary subject',
    description: 'You can practise the others any time — this only decides where we start.',
    wide: true,
  },
  {
    key: 'level',
    eyebrow: 'Starting point',
    title: 'How does practice feel right now?',
    description: 'It sets the difficulty of your first tasks. Nothing is locked in.',
  },
  {
    key: 'goal',
    eyebrow: 'Your goal',
    title: 'What are you working toward?',
    description: 'Choose the outcome that matters most right now.',
  },
  {
    key: 'target_competition_type',
    eyebrow: 'Optional',
    title: 'Preparing for a particular kind of competition?',
    description: 'Skip this if you are not sure yet — it only shapes the style of practice.',
  },
  {
    key: 'training_intensity',
    eyebrow: 'Your rhythm',
    title: 'How often would you like to train?',
    description: 'Start sustainably. Your weekly plan is built from this, and you can change it.',
  },
]

const SUMMARY_LABELS: Record<ProfileField, string> = {
  grade: 'Grade',
  primary_subject: 'Primary subject',
  level: 'Current level',
  goal: 'Goal',
  target_competition_type: 'Competition type',
  training_intensity: 'Training rhythm',
}

/** Long enough to see the tick land, short enough not to feel like a wait. */
const ADVANCE_DELAY_MS = 260

const REVIEW = steps.length

function firstUnanswered(answers: Answers) {
  const index = steps.findIndex((step) => !answers[step.key] && !isOptional(step.key))
  return index === -1 ? REVIEW : index
}

/** `next` is where the student was heading when asked to sign up — a class invite, usually. */
export function OnboardingFlow({ next }: { next?: string }) {
  const t = useT()

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
      else setError(result.error ?? t('Unable to save your setup.'))
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
    <main className="relative min-h-dvh overflow-hidden bg-void px-5 py-6 sm:px-8 sm:py-8">
      <div className="hero-atmosphere opacity-50" aria-hidden>
        <div className="hero-grid" />
        <span className="hero-bar hero-bar--blue" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] max-w-xl flex-col">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label={t('OlympAI home')}>
            <BrandMark />
          </Link>
          <span className="flex items-center gap-3">
            <span className="font-mono text-xs text-smoke">
              {isReview ? t('Review') : t('{n} of {total}', { n: step + 1, total: steps.length })}
            </span>
            <LanguageSwitcher />
          </span>
        </div>

        <div
          className="mt-6 h-1 overflow-hidden rounded-full bg-white/[0.08]"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('Setup progress')}
        >
          <div
            className="h-full rounded-full bg-mist transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>

        <div className="my-auto py-8 sm:py-12">
          {isReview ? (
            <ReviewStep answers={answers} answeredCount={answeredCount} onEdit={goTo} />
          ) : (
            <>
              <div key={step} className="page-in">
              <p className="eyebrow">{t(current!.eyebrow)}</p>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="mt-4 text-[32px] leading-[1.15] font-normal text-white outline-none sm:text-[40px]"
              >
                {t(current!.title)}
              </h1>
              <p className="mt-3 text-ash">{t(current!.description)}</p>

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
                        'spotlight rise flex min-h-14 items-center gap-3 rounded-xl bg-card p-4 text-left transition-all duration-200',
                        active
                          ? 'bg-white/[0.07] shadow-key-strong'
                          : 'shadow-key hover:bg-white/[0.04]',
                      )}
                    >
                      <span
                        className={cn(
                          'kbd shrink-0 tabular-nums',
                          active
                            ? 'bg-mist text-[#1b1c1e]'
                            : '',
                        )}
                      >
                        {active ? <Check className="size-3" /> : index + 1}
                      </span>
                      <span className="font-medium text-white">{t(option)}</span>
                    </button>
                  )
                })}
              </div>
              </div>
            </>
          )}

          {error ? (
            <p role="alert" className="mt-4 rounded-lg bg-ember/60 p-3 text-sm text-[#ffb3b3] shadow-key">
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
              <ArrowLeft className="size-4" /> {t('Back')}
            </Button>

            {isReview ? (
              <Button className="min-h-11 flex-1" onClick={submit} disabled={pending}>
                {pending ? t('Saving…') : t('Start training')} <ArrowRight className="size-4" />
              </Button>
            ) : isOptional(current!.key) && !choice ? (
              <Button variant="ghost" className="min-h-11 flex-1" onClick={skip}>
                {t('Skip this question')} <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                className="min-h-11 flex-1"
                onClick={() => goTo(step + 1)}
                disabled={!choice}
              >
                {t('Continue')} <ArrowRight className="size-4" />
              </Button>
            )}
          </div>

          <p className="mt-5 text-center font-mono text-[11px] text-smoke">
            {isReview
              ? t('Press Enter to finish')
              : t('Press 1–9 to choose · Enter to continue · Backspace to go back')}
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
}: {
  answers: Answers
  answeredCount: number
  onEdit: (index: number) => void
}) {
  const t = useT()

  return (
    <>
      <p className="eyebrow">{t('Almost there')}</p>
      <h1 className="mt-4 text-[32px] leading-[1.15] font-normal text-white sm:text-[40px]">
        {t('Does this look right?')}
      </h1>
      <p className="mt-3 text-ash">
        {answeredCount} {t('of')} {steps.length} {t('answered. Change anything you like — none of it is permanent.')}
      </p>

      <dl className="mt-7 divide-y divide-white/[0.06] overflow-hidden rounded-2xl bg-card shadow-key">
        {steps.map((entry, index) => {
          const value = answers[entry.key]
          return (
            <div key={entry.key} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <dt className="eyebrow">
                  {t(SUMMARY_LABELS[entry.key])}
                </dt>
                <dd
                  className={cn(
                    'mt-1.5 truncate font-medium text-white',
                    !value && 'font-normal italic text-muted-foreground',
                  )}
                >
                  {value ? t(value) : t('Skipped')}
                </dd>
              </div>
              <button
                type="button"
                onClick={() => onEdit(index)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ash transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Pencil className="size-3.5" />
                {t('Change')}
              </button>
            </div>
          )
        })}
      </dl>
    </>
  )
}
