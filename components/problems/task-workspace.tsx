'use client'

import { useState, type ReactNode } from 'react'
import { useT } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

/**
 * The statement and the solution, arranged by the width there is.
 *
 * On a laptop they sit side by side and the statement stays in view while the
 * solution is written: reading a condition from memory is how a sign gets lost.
 * On a tablet there is not room for both at a readable size, so one shows at a
 * time behind two tabs. On a phone they stack, statement first. Both halves stay
 * mounted throughout, so switching never loses what was typed.
 */
export function TaskWorkspace({ statement, solution }: { statement: ReactNode; solution: ReactNode }) {
  const t = useT()
  const [tab, setTab] = useState<'statement' | 'solution'>('statement')

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
      <div className="hidden gap-1 rounded-lg bg-muted p-1 md:flex lg:hidden">
        {(
          [
            ['statement', t.tasks.problem],
            ['solution', t.protocol.solutionTab],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 rounded-sm px-3 py-2 text-ui font-semibold transition-colors',
              tab === key ? 'bg-card text-foreground ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          'flex flex-col gap-6 lg:sticky lg:top-6 lg:col-span-5 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto',
          tab !== 'statement' && 'md:hidden',
        )}
      >
        {statement}
      </div>
      <div className={cn('flex flex-col gap-6 lg:col-span-7 lg:flex', tab !== 'solution' && 'md:hidden')}>
        {solution}
      </div>
    </div>
  )
}
