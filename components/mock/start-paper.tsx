'use client'

import { useState, useTransition } from 'react'
import { ArrowRight, Check, Clock, Loader2 } from 'lucide-react'
import { startPaper } from '@/app/(app)/mock/actions'
import { useT } from '@/components/i18n-provider'
import { DifficultyStars } from '@/components/difficulty-stars'
import { useRouter } from 'next/navigation'
import { cardClass, cn, liftClass } from '@/lib/utils'
import type { RealPaper } from '@/lib/mock'

/**
 * One real sitting, as a thing to sit.
 *
 * The composed mock above it is five problems the app chose; this is the four
 * that were actually set, in the order they were printed, for the time that was
 * given. For a student preparing for the oblast round there is no substitute.
 */
export function StartPaper({ paper }: { paper: RealPaper }) {
  const t = useT()
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  return (
    <li>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError('')
          startTransition(async () => {
            try {
              const result = await startPaper(paper.paper)
              if (!result.ok) setError(result.error ?? t.exam.notStarted)
              else router.refresh()
            } catch {
              setError(t.common.offline)
            }
          })
        }}
        className={cn(cardClass, liftClass, 'group flex w-full items-center gap-3 p-4 text-left')}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{paper.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{t.mock.paperShape(paper.taskIds.length, paper.durationMinutes)}</span>
            <DifficultyStars
              level={Math.round(
                paper.difficulties.reduce((sum, level) => sum + level, 0) / paper.difficulties.length,
              )}
            />
            {paper.solved > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Check className="size-3" />
                {t.mock.paperSeen(paper.solved)}
              </span>
            ) : null}
          </span>
        </span>
        {pending ? (
          <Loader2 className="size-4 shrink-0 animate-spin" />
        ) : (
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
        )}
      </button>
      {error ? (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  )
}

/** The clock on a real paper is the one the olympiad gave, not an estimate. */
export function PaperClock({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Clock className="size-3" /> {minutes}
    </span>
  )
}
