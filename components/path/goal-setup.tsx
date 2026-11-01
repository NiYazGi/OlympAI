'use client'

import { useMemo, useState, useTransition } from 'react'
import { CalendarDays, Check, Flag, Trophy } from 'lucide-react'
import { setGoal } from '@/app/(app)/path/actions'
import { Button } from '@/components/ui/button'
import { cardClass, cn } from '@/lib/utils'
import type { CompetitionOption } from '@/lib/types'

/** Offered horizons, in days. */
const HORIZONS = [
  { days: 30, label: '1 month' },
  { days: 90, label: '3 months' },
  { days: 180, label: '6 months' },
  { days: 365, label: '1 year' },
]

function isoIn(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * `preferredType` is the answer to onboarding's "preparing for a particular
 * kind of competition?" — which was stored and then read by nothing, so the
 * student was asked the same question twice and the first answer vanished.
 * Matching entries are sorted to the top rather than filtered, because the
 * answer was optional and hiding the rest would turn a hint into a wall.
 */
/** Onboarding's answers, mapped onto the levels the catalogue actually uses. */
const LEVELS_FOR_TYPE: Record<string, string[]> = {
  'School or regional': ['School', 'Regional'],
  'National selection': ['National'],
  'International preparation': ['International'],
}

export function GoalSetup({
  competitions,
  currentId,
  currentDate,
  preferredType = null,
  compact = false,
}: {
  competitions: CompetitionOption[]
  currentId: string | null
  currentDate: string | null
  preferredType?: string | null
  compact?: boolean
}) {
  const [open, setOpen] = useState(!compact)
  const [competitionId, setCompetitionId] = useState(currentId ?? '')
  const [date, setDate] = useState(currentDate ?? '')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const grouped = useMemo(() => {
    const wanted = LEVELS_FOR_TYPE[preferredType ?? ''] ?? []
    const matches = (entry: CompetitionOption) =>
      wanted.length > 0 && entry.level !== null && wanted.includes(entry.level)
    const byPreference = (a: CompetitionOption, b: CompetitionOption) =>
      Number(matches(b)) - Number(matches(a))

    const named = competitions.filter((entry) => entry.subjectId).sort(byPreference)
    const generic = competitions.filter((entry) => !entry.subjectId).sort(byPreference)
    return { named, generic, hasPreference: competitions.some(matches) }
  }, [competitions, preferredType])

  const chosen = competitions.find((entry) => entry.id === competitionId) ?? null
  const tomorrow = isoIn(1)
  const twoYears = isoIn(730)

  function save() {
    setError('')
    const formData = new FormData()
    formData.set('competition_id', competitionId)
    formData.set('target_date', date)
    startTransition(async () => {
      try {
        const result = await setGoal(formData)
        if (result.ok) setOpen(false)
        else setError(result.error ?? 'That did not save.')
      } catch {
        setError('That did not save. Check your connection and try again.')
      }
    })
  }

  if (compact && !open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Change goal
      </Button>
    )
  }

  return (
    <section className={cn(compact ? 'disclose w-full' : `${cardClass} p-6`)}>
      {!compact ? (
        <>
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
            <Flag className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">What are you preparing for?</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            {grouped.hasPreference && preferredType
              ? `You said you were aiming at ${preferredType.toLowerCase()}, so those are listed first. `
              : ''}
            Choose the competition and the date you are aiming at. The schedule, the weekly load and
            your readiness are worked out from there.
          </p>
        </>
      ) : null}

      <fieldset className="mt-5">
        <legend className="text-caption font-semibold text-muted-foreground">
          Competition
        </legend>
        {/*
          The named cards and the generic chips below are one choice, not two.
          They look like separate questions, so a chip could silently clear a
          competition picked above — this line makes the single selection
          visible wherever it was made.
        */}
        <p className="mt-2 text-sm" aria-live="polite">
          {chosen ? (
            <>
              <span className="text-muted-foreground">Selected: </span>
              <span className="font-medium text-foreground">{chosen.name}</span>
              {chosen.subjectName ? (
                <span className="text-muted-foreground"> · {chosen.subjectName}</span>
              ) : (
                <span className="text-muted-foreground"> · you choose the subject</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">Nothing selected yet — pick one below.</span>
          )}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {grouped.named.map((entry) => {
            const active = entry.id === competitionId
            const empty = entry.taskCount === 0
            return (
              <button
                key={entry.id}
                type="button"
                disabled={empty}
                onClick={() => setCompetitionId(entry.id)}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                  active
                    ? 'border-primary bg-accent/60'
                    : 'border-border hover:border-primary/40 hover:bg-accent/30',
                  empty && 'cursor-not-allowed opacity-45 hover:border-border hover:bg-transparent',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                    active && 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {active ? <Check className="size-3" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{entry.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {entry.subjectName}
                    {empty ? ' · no tasks yet' : ` · ${entry.taskCount} tasks`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {grouped.generic.length ? (
          <>
            <p className="mt-4 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Or</span> a stage rather than a named
              contest. Choosing one of these replaces the selection above, and you pick the subject
              yourself.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {grouped.generic.map((entry) => {
                const active = entry.id === competitionId
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setCompetitionId(entry.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/40',
                    )}
                  >
                    {entry.name}
                  </button>
                )
              })}
            </div>
          </>
        ) : null}
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-caption font-semibold text-muted-foreground">
          Target date
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {HORIZONS.map((horizon) => {
            const value = isoIn(horizon.days)
            const active = date === value
            return (
              <button
                key={horizon.days}
                type="button"
                onClick={() => setDate(value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary/40',
                )}
              >
                {horizon.label}
              </button>
            )
          })}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" />
          <span className="sr-only">Exact date</span>
          <input
            type="date"
            value={date}
            min={tomorrow}
            max={twoYears}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
        {/* The catalogue holds no dates on purpose: sittings move every year, so
            the official page is the only trustworthy source. */}
        {chosen?.registrationUrl ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Check this year&apos;s date on the{' '}
            <a
              href={chosen.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              official page
            </a>
            .
          </p>
        ) : null}
      </fieldset>

      {error ? (
        <p
          role="alert"
          className="disclose mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <Button
        className="mt-6 w-full sm:w-auto"
        onClick={save}
        disabled={pending || !competitionId || !date}
      >
        <Trophy className="size-4" />
        {pending ? 'Saving…' : 'Set this goal'}
      </Button>
    </section>
  )
}
