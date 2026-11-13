'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

/**
 * What the AI is doing while it works: a pulsing mark and a line that moves
 * through the stages of the job, so a 10–20 second wait reads as progress, not
 * as a frozen page. The stages follow time, not the model, and stay on the
 * last one until the answer arrives.
 */
const STAGES = {
  chat: ['Reading your message', 'Thinking it through', 'Looking at similar problems', 'Choosing the right hint', 'Writing the reply'],
  grading: ['Reading your solution', 'Checking each step', 'Comparing with the reference solution', 'Weighing the points', 'Writing the feedback'],
  photo: ['Looking at the photo', 'Reading the handwriting', 'Putting the formulas together'],
  paper: ['Collecting your answers', 'Checking each problem', 'Adding up the points', 'Writing the report'],
} as const

export type ThinkingKind = keyof typeof STAGES

export function AiThinking({ kind = 'chat', className }: { kind?: ThinkingKind; className?: string }) {
  const t = useT()
  const stages = STAGES[kind]
  const [step, setStep] = useState(0)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const started = Date.now()
    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - started) / 1000
      setSeconds(Math.floor(elapsed))
      // Quick at first, slower later: the long tail is usually the last stage.
      setStep(Math.min(stages.length - 1, Math.floor(Math.sqrt(elapsed / 1.6))))
    }, 400)
    return () => window.clearInterval(timer)
  }, [stages.length])

  return (
    <div role="status" aria-live="polite" className={cn('flex items-center gap-3 text-sm', className)}>
      <span className="ai-orb relative flex size-6 shrink-0 items-center justify-center" aria-hidden>
        <span className="ai-orb-ring absolute inset-0 rounded-full" />
        <span className="ai-orb-core size-2.5 rounded-full" />
      </span>
      <span className="min-w-0">
        <span key={step} className="think-line text-shimmer inline-block">
          {t(stages[step])}
        </span>
        <span className="think-dots ml-0.5 text-muted-foreground" aria-hidden>
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
        {seconds >= 6 ? <span className="ml-2 font-mono text-[11px] text-muted-foreground tabular-nums">{seconds} s</span> : null}
      </span>
    </div>
  )
}
