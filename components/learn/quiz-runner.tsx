'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2, RotateCcw, X } from 'lucide-react'
import { answerQuizQuestion } from '@/app/(app)/learn/actions'
import { Button } from '@/components/ui/button'
import type { TopicQuiz } from '@/lib/types'
import { cardClass, cn } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'
import { MathLine } from '@/components/sulu/rich-message'

type Outcome = { isCorrect: boolean; correctIndex: number; explanation: string; xpEarned: number }
type Miss = { id: string; prompt: string; chosen: string; correct: string; explanation: string }

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
export function QuizRunner({ quiz, sessionId }: { quiz: TopicQuiz; sessionId?: string }) {
  const t = useT()

  const router = useRouter()
  // The questions of this round: all of them, or only the ones missed last time.
  const [round, setRound] = useState(quiz.questions)
  const [misses, setMisses] = useState<Miss[]>([])
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [error, setError] = useState('')
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [earned, setEarned] = useState(0)
  const [pending, startTransition] = useTransition()

  const question = round[index]
  const finished = index >= round.length

  function choose(option: number) {
    if (outcome || pending) return
    setChosen(option)
    setError('')
    startTransition(async () => {
      // Options are shuffled for display; the server marks the stored index.
      const result = await answerQuizQuestion(question.id, question.optionOrder[option], sessionId)
      if (!result.ok) {
        setChosen(null)
        setError(result.error)
        return
      }
      const shown = question.optionOrder.indexOf(result.correctIndex)
      setOutcome({ ...result, correctIndex: shown })
      if (!result.isCorrect) {
        setMisses((list) => [
          ...list,
          {
            id: question.id,
            prompt: question.prompt,
            chosen: question.options[option],
            correct: question.options[shown],
            explanation: result.explanation,
          },
        ])
      }
      setAnswered((n) => n + 1)
      setEarned((n) => n + result.xpEarned)
      if (result.isCorrect) setScore((n) => n + 1)
    })
  }

  function next() {
    setChosen(null)
    setOutcome(null)
    setIndex((n) => n + 1)
    if (index + 1 >= round.length) router.refresh()
  }

  function restart(onlyMissed = false) {
    const missed = new Set(misses.map((miss) => miss.id))
    setRound(onlyMissed ? quiz.questions.filter((item) => missed.has(item.id)) : quiz.questions)
    setMisses([])
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
        <p className="text-sm text-muted-foreground">{t('This round')}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          {score} <span className="text-muted-foreground">/ {answered}</span>
        </p>
        <p className="mt-1 text-sm font-medium text-primary tabular-nums">+{earned} {t('XP')}</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {score === answered
            ? t('Every one right. The facts behind them are worth committing to cards before you move on.')
            : t('Worth another pass. A question you got wrong is the most useful thing on this page.')}
        </p>
        {misses.length ? (
          <ul className="mx-auto mt-5 max-w-xl space-y-3 text-left">
            {misses.map((miss) => (
              <li key={miss.id} className="rounded-lg bg-foreground/[0.03] p-4 text-sm ring-1 ring-foreground/10">
                <p className="font-medium"><MathLine text={miss.prompt} /></p>
                <p className="mt-2 text-destructive">
                  <X className="mr-1 inline size-3.5" />
                  <MathLine text={miss.chosen} />
                </p>
                <p className="mt-1 text-primary">
                  <Check className="mr-1 inline size-3.5" />
                  <MathLine text={miss.correct} />
                </p>
                <p className="mt-2 leading-6 text-muted-foreground"><MathLine text={miss.explanation} /></p>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {misses.length ? (
            <Button onClick={() => restart(true)}>
              <RotateCcw className="size-4" /> {t('Retry the ones I missed')}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => restart()}>
            <RotateCcw className="size-4" /> {t('Go again')}
          </Button>
          <Button
            nativeButton={false}
            render={
              <Link href={`/learn/${quiz.topicSlug}/cards`} prefetch>
                {t('Review the cards')}
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
          {t('Question')} {index + 1} {t('of')} {round.length}
        </span>
        <span className="tabular-nums">
          {score}/{answered} {t('right')}
        </span>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${(index / round.length) * 100}%` }}
        />
      </div>

      <div className={cn(cardClass, 'p-5 sm:p-6')}>
        <h2 className="text-lg leading-7 font-medium text-balance"><MathLine text={question.prompt} /></h2>

        <ul className="mt-5 space-y-2">
          {question.options.map((option, optionIndex) => {
            const isChosen = chosen === optionIndex
            const isAnswer = outcome?.correctIndex === optionIndex
            const wrongChoice = Boolean(outcome) && isChosen && !outcome!.isCorrect

            return (
              <li key={`${question.id}-${optionIndex}`}>
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
                  <span className="min-w-0 flex-1"><MathLine text={option} /></span>
                  {pending && isChosen ? (
                    <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>

        {error ? (
          <p role="alert" className="mt-4 rounded-lg bg-ember/60 p-3 text-sm text-destructive shadow-key">
            {error}
          </p>
        ) : null}

        {outcome ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 mt-5 space-y-3 border-t border-foreground/10 pt-5 duration-300">
            <div className="flex flex-wrap items-center gap-2">
              <p className={cn('font-medium', outcome.isCorrect ? 'text-primary' : 'text-warning')}>
                {outcome.isCorrect ? t('Right.') : t('Not this time.')}
              </p>
              {/* A question pays once, ever, so a re-run earns nothing and says
                  so rather than silently paying zero. */}
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                {outcome.xpEarned > 0 ? t('+{xpEarned} XP', { xpEarned: outcome.xpEarned }) : t('Already counted')}
              </span>
            </div>
            <p className="text-sm leading-6 text-pretty text-muted-foreground">
              <MathLine text={outcome.explanation} />
            </p>
            <Button onClick={next}>
              {index + 1 >= round.length ? t('See the result') : t('Next question')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
