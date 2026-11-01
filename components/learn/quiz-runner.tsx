'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2, RotateCcw, X } from 'lucide-react'
import { answerQuizQuestion } from '@/app/(app)/learn/actions'
import { CountUp } from '@/components/count-up'
import { Meter } from '@/components/meter'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import type { TopicQuiz } from '@/lib/types'
import { useT } from '@/components/i18n-provider'
import { cardClass, cn } from '@/lib/utils'

type Outcome = { isCorrect: boolean; correctIndex: number; explanation: string; xpEarned: number }

/**
 * Active recall, one question at a time.
 *
 * Marked the moment an option is chosen, because the value of the check is in
 * the gap between committing to an answer and finding out — a page of
 * questions marked at the end is a test, and this is not the test step.
 *
 * The marking happens on the server: the answer key was never sent here, so
 * there is nothing in this component to read ahead in.
 *
 * Answering is a keyboard job: number keys choose, Enter moves on. Someone
 * working through twenty questions should not have to move a hand to a mouse
 * between each one — and the next question replaces this one at once, because
 * anything between the answer and the next question is a thing to sit through.
 */
export function QuizRunner({ quiz }: { quiz: TopicQuiz }) {
  const t = useT()
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [error, setError] = useState('')
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [earned, setEarned] = useState(0)
  const [pending, startAnswer] = useTransition()

  const question = quiz.questions[index]
  const finished = index >= quiz.questions.length

  function choose(option: number) {
    if (outcome || pending) return
    setChosen(option)
    setError('')
    startAnswer(async () => {
      try {
        const result = await answerQuizQuestion(question.id, option)
        if (!result.ok) {
          setChosen(null)
          setError(result.error)
          return
        }
        setOutcome(result)
        setAnswered((n) => n + 1)
        setEarned((n) => n + result.xpEarned)
        if (result.isCorrect) setScore((n) => n + 1)
      } catch {
        // A dropped connection used to throw out of the transition and take
        // the whole page to the error boundary, losing the round.
        setChosen(null)
        setError(t.quiz.notSent)
      }
    })
  }

  function next() {
    setChosen(null)
    setOutcome(null)
    setIndex((n) => n + 1)
    if (index + 1 >= quiz.questions.length) router.refresh()
  }

  function restart() {
    setIndex(0)
    setChosen(null)
    setOutcome(null)
    setScore(0)
    setAnswered(0)
    setEarned(0)
  }

  // Number keys answer, Enter moves on. No dependency array: the handler
  // closes over the current question, and re-binding a listener is cheaper
  // than keeping the state in a ref to avoid it.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      // The Next button takes focus when an answer is marked, so Enter is
      // already going to click it; handling it here as well would skip one.
      if (target instanceof HTMLButtonElement) return
      if (finished) return

      if (event.key === 'Enter' && outcome) {
        event.preventDefault()
        next()
        return
      }
      if (outcome || pending) return
      const number = Number(event.key)
      const letter = event.key.toUpperCase().charCodeAt(0) - 65
      const options = question.options.length
      const option =
        Number.isInteger(number) && number >= 1 && number <= options
          ? number - 1
          : /^[a-z]$/i.test(event.key) && letter >= 0 && letter < options
            ? letter
            : null
      if (option !== null) {
        event.preventDefault()
        choose(option)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (finished) {
    const perfect = answered > 0 && score === answered
    return (
      <div
        className={cn(
          cardClass,
          'animate-in fade-in zoom-in-95 p-6 text-center duration-400 sm:p-8',
        )}
      >
        <p className="text-sm text-muted-foreground">{t.quiz.thisRound}</p>
        <p className="font-display mt-1 text-4xl leading-none font-bold tabular-nums">
          <CountUp value={score} delay={200} duration={600} />{' '}
          <span className="text-muted-foreground">/ {answered}</span>
        </p>
        <p className="mt-1 text-sm font-medium text-primary tabular-nums">
          <CountUp value={earned} prefix="+" suffix=" XP" delay={400} duration={600} />
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {perfect ? t.quiz.allRight : t.quiz.another}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={restart}>
            <RotateCcw className="size-4" /> {t.quiz.goAgain}
          </Button>
          <Button
            nativeButton={false}
            render={
              <Link href={`/learn/${quiz.topicSlug}/cards`} prefetch>
                {t.quiz.reviewCards}
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="tabular-nums">
          {t.quiz.questionOf(index + 1, quiz.questions.length)}
        </span>
        <span className="tabular-nums">
          {t.quiz.rightOf(score, answered)}
        </span>
      </div>

      <Meter
        value={(index / quiz.questions.length) * 100}
        className="h-1"
        label={t.quiz.title}
      />

      <div className={cn(cardClass, 'p-5 sm:p-6')}>
        <h2 className="text-lg leading-7 font-medium text-balance">{question.prompt}</h2>

        <ul className="mt-5 space-y-2">
          {question.options.map((option, optionIndex) => {
            const isChosen = chosen === optionIndex
            const isAnswer = outcome?.correctIndex === optionIndex
            const wrongChoice = Boolean(outcome) && isChosen && !outcome!.isCorrect

            return (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => choose(optionIndex)}
                  disabled={Boolean(outcome) || pending}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg p-3.5 text-left text-sm leading-6 ring-1 transition-all duration-200',
                    'active:not-disabled:translate-y-px',
                    'disabled:cursor-default',
                    isAnswer
                      ? 'bg-primary/10 ring-primary/50'
                      : wrongChoice
                        ? 'bg-destructive/10 ring-destructive/40'
                        : 'ring-foreground/10 hover:bg-muted/60',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium ring-1',
                      isAnswer
                        ? 'bg-primary text-primary-foreground ring-transparent'
                        : wrongChoice
                          ? 'bg-destructive/20 text-destructive ring-transparent'
                          : 'text-muted-foreground ring-foreground/20',
                    )}
                  >
                    {isAnswer ? (
                      <Check className="size-3" />
                    ) : wrongChoice ? (
                      <X className="size-3" />
                    ) : (
                      String.fromCharCode(65 + optionIndex)
                    )}
                  </span>
                  <span className="min-w-0 flex-1">{option}</span>
                  {pending && isChosen ? (
                    <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>

        {error ? (
          <p
            role="alert"
            className="disclose mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {outcome ? (
          <div className="disclose mt-5 space-y-3 border-t border-foreground/10 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn('font-medium', outcome.isCorrect ? 'text-success' : 'text-warning')}
              >
                {outcome.isCorrect ? t.quiz.right : t.quiz.notThisTime}
              </p>
              {/* A question pays once, ever, so a re-run earns nothing and says
                    so rather than silently paying zero. */}
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                {outcome.xpEarned > 0 ? `+${outcome.xpEarned} XP` : t.quiz.alreadyCounted}
              </span>
            </div>
            <p className="font-reading text-sm leading-6 text-pretty text-muted-foreground">
              {outcome.explanation}
            </p>
            <Button onClick={next} autoFocus>
              {index + 1 >= quiz.questions.length ? t.quiz.seeResult : t.quiz.nextQuestion}
              <Kbd className="ml-1">↵</Kbd>
            </Button>
          </div>
        ) : null}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        <Kbd>1</Kbd>–<Kbd>{String(Math.min(9, question.options.length))}</Kbd> {t.quiz.keyHint} ·{' '}
        <Kbd>↵</Kbd> {t.quiz.keyNext}
      </p>
    </div>
  )
}

