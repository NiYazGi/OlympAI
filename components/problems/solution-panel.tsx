'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Lightbulb, Loader2, Sparkles, TrendingUp, XCircle, Zap } from 'lucide-react'
import { submitTaskAttempt, type AttemptResult } from '@/app/(app)/tasks/actions'
import type { Verdict } from '@/lib/sulu/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cardClass, cn } from '@/lib/utils'

type Graded = Extract<AttemptResult, { ok: true }>

const VERDICT_COPY: Record<Verdict, { title: string; tone: string; Icon: typeof CheckCircle2 }> = {
  correct: { title: 'Solved — nicely done.', tone: 'ring-emerald-500/40', Icon: CheckCircle2 },
  partially_correct: { title: 'Nearly there.', tone: 'ring-primary/25', Icon: TrendingUp },
  incorrect: { title: 'Not yet — keep going.', tone: 'ring-primary/20', Icon: TrendingUp },
  not_an_attempt: {
    title: 'That is not a solution yet.',
    tone: 'ring-destructive/30',
    Icon: XCircle,
  },
}

export function SolutionPanel({ hints, taskId }: { hints: string[]; taskId: string }) {
  const [solution, setSolution] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<Graded | null>(null)
  const [hintIndex, setHintIndex] = useState(-1)
  const [error, setError] = useState('')

  async function check() {
    if (!solution.trim() || checking) return
    setChecking(true)
    setResult(null)
    setError('')
    try {
      const response = await submitTaskAttempt(taskId, solution)
      if (response.ok) setResult(response)
      else setError(response.error)
    } catch {
      setError('Your attempt could not be submitted. Check your connection and try again.')
    } finally {
      setChecking(false)
    }
  }

  const copy = result ? VERDICT_COPY[result.verdict] : null
  const revealedHint = hintIndex >= 0 ? hints[Math.min(hintIndex, hints.length - 1)] : null

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground">Your solution</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Explain the reasoning, not only the final answer — it is graded on the derivation.
        </p>
      </div>

      <Textarea
        value={solution}
        onChange={(event) => {
          setSolution(event.target.value)
          setError('')
          if (result) setResult(null)
        }}
        placeholder="Write your reasoning and equations here…"
        className="min-h-56 flex-1 resize-none px-3 py-3 font-mono text-base leading-relaxed sm:min-h-72"
      />

      {result && copy ? (
        <div className={cn(cardClass, 'space-y-3 p-4', copy.tone)}>
          <div className="flex items-center gap-2">
            <copy.Icon
              className={cn(
                'size-4 shrink-0',
                result.verdict === 'correct' ? 'text-emerald-500' : 'text-primary',
              )}
            />
            <p className="font-semibold">{copy.title}</p>
            <span className="ml-auto shrink-0 text-sm font-semibold text-primary">
              {result.score}/100
            </span>
          </div>

          {/* The reward lands with the verdict. Without this the XP on the
              dashboard appeared out of nowhere, disconnected from the work. */}
          {result.xpEarned > 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2">
              <Zap className="size-4 shrink-0 text-primary" />
              <span className="text-sm font-semibold text-accent-foreground">
                +{result.xpEarned} XP
              </span>
              <span className="text-xs text-muted-foreground">
                {result.firstSolve
                  ? 'first solve'
                  : result.repeat
                    ? 'already solved — reduced'
                    : 'for the attempt'}
              </span>
            </div>
          ) : null}
          <p className="text-sm leading-relaxed text-foreground/90">{result.feedback}</p>
          {result.nextHint ? (
            <p className="rounded-lg bg-accent p-3 text-sm leading-relaxed text-accent-foreground">
              {result.nextHint}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
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
            {hintIndex < 0 ? 'Show a hint' : `Next hint (${hintIndex + 1}/${hints.length})`}
          </Button>
          {revealedHint ? (
            <p className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">
              {revealedHint}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-1 flex flex-col gap-2 bg-card px-1 pb-1 pt-2 sm:static sm:mx-0 sm:flex-row sm:bg-transparent sm:p-0">
        <Button
          className="min-h-11 w-full sm:w-auto"
          onClick={check}
          disabled={!solution.trim() || checking}
        >
          {checking ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Grading…
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" /> Submit solution
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          nativeButton={false}
          render={
            <Link href="/sulu-ai">
              <Sparkles className="size-4" /> Ask Sulu AI
            </Link>
          }
        />
      </div>
    </div>
  )
}
