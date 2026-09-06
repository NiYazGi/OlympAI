'use client'

import { useState, useTransition } from 'react'
import { Check, Target } from 'lucide-react'
import { setTargetSubject } from '@/app/(app)/path/actions'
import { Button } from '@/components/ui/button'
import { cardClass, cn } from '@/lib/utils'

export function TargetPicker({
  subjects,
  current,
  compact = false,
}: {
  subjects: { id: string; name: string; taskCount: number }[]
  current: string | null
  compact?: boolean
}) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(!compact)

  function choose(id: string) {
    setError('')
    startTransition(async () => {
      const result = await setTargetSubject(id)
      if (result.ok) setOpen(false)
      else setError(result.error ?? 'That did not save.')
    })
  }

  if (compact && !open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Change subject
      </Button>
    )
  }

  return (
    <section className={cn(compact ? 'w-full' : `${cardClass} p-6`)}>
      {!compact ? (
        <>
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
            <Target className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Choose what you are training for</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Pick a subject and the path lays itself out: topics in order of difficulty, each one
            unlocking the next.
          </p>
        </>
      ) : null}

      <div className={cn('grid gap-2 sm:grid-cols-2', compact ? 'mt-0' : 'mt-5')}>
        {subjects.map((subject) => {
          const active = subject.id === current
          const empty = subject.taskCount === 0
          return (
            <button
              key={subject.id}
              type="button"
              disabled={pending || empty}
              onClick={() => choose(subject.id)}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                active
                  ? 'border-primary bg-accent/60'
                  : 'border-border hover:border-primary/40 hover:bg-accent/30',
                empty && 'cursor-not-allowed opacity-45 hover:border-border hover:bg-transparent',
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border',
                  active && 'border-primary bg-primary text-primary-foreground',
                )}
              >
                {active ? <Check className="size-3" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{subject.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {empty
                    ? 'no tasks yet'
                    : `${subject.taskCount} task${subject.taskCount === 1 ? '' : 's'}`}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
