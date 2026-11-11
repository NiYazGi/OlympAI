'use client'

import { useId, useState, useTransition, type FormEvent } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { setGoal } from '@/app/(app)/path/actions'
import { useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CompetitionOption, Goal } from '@/lib/types'

const HORIZONS = [{ days: 30, label: '1 month' }, { days: 90, label: '3 months' }, { days: 180, label: '6 months' }]
const field = 'h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60'

export function PreparationGoalForm({ goal, competitions, subjects, today }: {
  goal: Goal
  competitions: CompetitionOption[]
  subjects: { id: string; name: string; taskCount: number }[]
  today: string
}) {
  const t = useT()
  const id = useId()
  const [subjectId, setSubjectId] = useState(subjects.some((subject) => subject.id === goal.subjectId) ? goal.subjectId! : '')
  const [competitionId, setCompetitionId] = useState(goal.competition?.id ?? '')
  const [date, setDate] = useState(goal.targetDate ?? '')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const available = competitions.filter((entry) => !entry.subjectId || entry.subjectId === subjectId)
  const chosen = available.find((entry) => entry.id === competitionId)
  function dateAfter(days: number) {
    return new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    startTransition(async () => {
      try {
        const result = await setGoal(data)
        if (!result.ok) setError(result.error ?? t('That did not save.'))
        // setGoal revalidates /dashboard: the actual route replaces this form
        // in the same Server Action response, using this account's saved goal.
      } catch {
        setError(t('That did not save. Please try again.'))
      }
    })
  }
  return <form onSubmit={save} aria-busy={pending} className="mt-6 space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_minmax(15rem,2fr)_minmax(11rem,1fr)]">
      <label htmlFor={`${id}-subject`} className="min-w-0 space-y-2 text-sm font-medium">
        <span>{t('Subject')}</span>
        <select id={`${id}-subject`} name="subject_id" required value={subjectId} disabled={pending}
          onChange={(event) => {
            const next = event.target.value
            setSubjectId(next)
            if (chosen?.subjectId && chosen.subjectId !== next) setCompetitionId('')
          }} className={field}>
          <option value="" disabled>{t('Choose a subject')}</option>
          {subjects.map((subject) => <option key={subject.id} value={subject.id} disabled={!subject.taskCount}>{t(subject.name)}</option>)}
        </select>
      </label>
      <label htmlFor={`${id}-competition`} className="min-w-0 space-y-2 text-sm font-medium">
        <span>{t('Competition')}</span>
        <select id={`${id}-competition`} name="competition_id" required value={chosen?.id ?? ''} disabled={pending || !subjectId}
          onChange={(event) => setCompetitionId(event.target.value)} className={field}>
          <option value="" disabled>{t('Choose an olympiad')}</option>
          {available.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select>
      </label>
      <label htmlFor={`${id}-date`} className="min-w-0 space-y-2 text-sm font-medium">
        <span>{t('Target date')}</span>
        <input id={`${id}-date`} name="target_date" type="date" required value={date} min={dateAfter(1)} max={dateAfter(730)}
          disabled={pending} onChange={(event) => setDate(event.target.value)} className={field} />
      </label>
    </div>
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="mr-1 text-muted-foreground">{t('Or plan for')}</span>
      {HORIZONS.map((horizon) => <button key={horizon.days} type="button" disabled={pending} aria-pressed={date === dateAfter(horizon.days)}
        onClick={() => setDate(dateAfter(horizon.days))}
        className={cn('rounded-full border px-3 py-1.5 transition-colors disabled:opacity-60', date === dateAfter(horizon.days) ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted')}>
        {t(horizon.label)}
      </button>)}
    </div>
    {chosen?.registrationUrl ? <p className="text-xs text-muted-foreground">{t('Check this year\'s date on the')}{' '}<a href={chosen.registrationUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{t('official page')}</a>.</p> : null}
    {error ? <p role="alert" className="rounded-xl bg-muted px-4 py-3 text-sm">{error}</p> : null}
    <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending || !subjectId || !chosen || !date}>
      {pending ? <><Loader2 aria-hidden className="size-4 motion-safe:animate-spin" />{t('Building your route…')}</> : <>{t('Create my route')}<ArrowRight aria-hidden className="size-4" /></>}
    </Button>
  </form>
}
