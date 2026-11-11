'use client'

import { useState, useTransition } from 'react'
import { ArrowRight, Check, Clock, Loader2 } from 'lucide-react'
import { startPaper } from '@/app/(app)/mock/actions'
import { useT } from '@/components/i18n-provider'
import { DifficultyStars } from '@/components/difficulty-stars'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cardClass, cn } from '@/lib/utils'
import type { RealPaper } from '@/lib/mock'

/**
 * One real sitting, as a thing to sit.
 *
 * The composed mock above it is five problems the app chose; this is the four
 * that were actually set, in the order they were printed, for the time that was
 * given. For a student preparing for the oblast round there is no substitute.
 */
const CLOCKS = [60, 120, 180, 240, 300]

export function StartPaper({ paper }: { paper: RealPaper }) {
  const t = useT()
  const router = useRouter()
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [minutes, setMinutes] = useState(paper.durationMinutes)
  const [pending, startTransition] = useTransition()
  const options = [...new Set([paper.durationMinutes, ...CLOCKS])].sort((x, y) => x - y)
  const label = (value: number) =>
    value % 60 === 0 ? t('{h} h', { h: value / 60 }) : value > 60 ? t('{h} h {m} min', { h: Math.floor(value / 60), m: value % 60 }) : t('{m} min', { m: value })

  function start() {
    setError('')
    startTransition(async () => {
      try {
        const result = await startPaper(paper.paper, minutes)
        if (!result.ok) setError(result.error ?? t('The test could not be started.'))
        else router.refresh()
      } catch {
        setError(t('That did not save. Check your connection and try again.'))
      }
    })
  }

  return (
    <li className={cn(cardClass, 'overflow-hidden')}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="group flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-foreground/[0.04]"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {paper.title}
            {paper.round ? <span className="text-muted-foreground">{t(' · round {n}', { n: paper.round })}</span> : null}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{t('{n} {n|problem|problems}', { n: paper.taskIds.length })}</span>
            <DifficultyStars
              level={Math.round(paper.difficulties.reduce((sum, level) => sum + level, 0) / paper.difficulties.length)}
            />
            {paper.solved > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Check className="size-3" />
                {t('{n} already solved', { n: paper.solved })}
              </span>
            ) : null}
          </span>
        </span>
        <ArrowRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-90')} />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border px-4 pt-3 pb-4">
          <div>
            <p className="text-sm font-medium">{t('How long is the round?')}</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {t('The default is an estimate from the problems. Set the time printed on the original paper for the round you are preparing for.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('How long is the round?')}>
            {options.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={minutes === value}
                onClick={() => setMinutes(value)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors',
                  minutes === value ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-secondary',
                )}
              >
                <Clock className="size-3.5" />
                {label(value)}
                {value === paper.durationMinutes ? <span className="opacity-70">· {t('estimate')}</span> : null}
              </button>
            ))}
          </div>
          <Button onClick={start} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {t('Start the paper')}
          </Button>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
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
