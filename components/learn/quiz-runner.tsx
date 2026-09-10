'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2, RotateCcw, X } from 'lucide-react'
import { answerQuizQuestion } from '@/app/(app)/learn/actions'
import { Button } from '@/components/ui/button'
import type { TopicQuiz } from '@/lib/types'
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
 */
export function QuizRunner({ quiz }: { quiz: TopicQuiz }) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [error, setError] = useState('')
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [earned, setEarned] = useState(0)
  const [pending, startTransition] = useTransition()

  const question = quiz.questions[index]
  const finished = index >= quiz.questions.length

  function choose(option: number) {
    if (outcome || pending) return
    setChosen(option)
    setError('')
    startTransition(async () => {
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

  if (finished) {
    return (
      <div className={cn(cardClass, 'animate-in fade-in zoom-in-95 p-6 text-center duration-400 sm:p-8')}>
        <p className="text-sm text-muted-foreground">This round</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          {score} <span className="text-muted-foreground">/ {answered}</span>
        </p>
        <p className="mt-1 text-sm font-medium text-primary tabular-nums">+{earned} XP</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {score === answered
            ? 'Every one right. The facts behind them are worth committing to cards before you move on.'
            : 'Worth another pass. A question you got wrong is the most useful thing on this page.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={restart}>
            <RotateCcw className="size-4" /> Go again
          </Button>
          <Button
            nativeButton={false}
            render={
              <Link href={`/learn/${quiz.topicSlug}/cards`} prefetch>
                Review the cards
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
          Question {index + 1} of {quiz.questions.length}
        </span>
        <span className="tabular-nums">
          {score}/{answered} right
        </span>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${(index / quiz.questions.length) * 100}%` }}
        />
      </div>

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
          <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {outcome ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 mt-5 space-y-3 border-t border-foreground/10 pt-5 duration-300">
            <div className="flex flex-wrap items-center gap-2">
              <p className={cn('font-medium', outcome.isCorrect ? 'text-primary' : 'text-amber-500')}>
                {outcome.isCorrect ? 'Right.' : 'Not this time.'}
              </p>
              {/* A question pays once, ever, so a re-run earns nothing and says
                  so rather than silently paying zero. */}
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                {outcome.xpEarned > 0 ? `+${outcome.xpEarned} XP` : 'Already counted'}
              </span>
            </div>
            <p className="text-sm leading-6 text-pretty text-muted-foreground">
              {outcome.explanation}
            </p>
            <Button onClick={next}>
              {index + 1 >= quiz.questions.length ? 'See the result' : 'Next question'}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
