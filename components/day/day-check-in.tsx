'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { saveDay } from '@/app/(app)/dashboard/actions'
import { useT } from '@/components/i18n-provider'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/submit-button'
import type { DayInputs } from '@/lib/day-state'
import { AXIS_MAX, LIGHTS_OUT } from '@/lib/day-state'
import { cn } from '@/lib/utils'

/**
 * Five answers, and none of them a number the app could have looked up.
 *
 * Deliberately short. A check-in that takes two minutes is a check-in nobody
 * fills in on the day it would have mattered, and the numbers are meant to be
 * corrected through the day rather than settled in the morning — so it saves
 * over the same row instead of adding a second one.
 *
 * Hours come back rounded to the half hour they were entered in. Stored
 * minutes divided by sixty is 1.5833333333333333 in a number field, which is
 * how a student finds out the app is keeping a figure they never typed.
 */
export function DayCheckIn({ inputs }: { inputs: DayInputs }) {
  const t = useT()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [mental, setMental] = useState(inputs.mental)
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    setError('')
    setSaved(false)
    formData.set('mental', String(mental))
    startTransition(async () => {
      try {
        const result = await saveDay(formData)
        if (result.ok) setSaved(true)
        else setError(result.error ?? t.common.notSaved)
      } catch {
        setError(t.common.offline)
      }
    })
  }

  return (
    <form action={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Hours
          name="theory_hours"
          label={t.day.form.theoryLabel}
          hint={t.day.form.theoryHint}
          value={inputs.theoryMinutes}
        />
        <Hours
          name="solving_hours"
          label={t.day.form.solvingLabel}
          hint={t.day.form.solvingHint}
          value={inputs.solvingMinutes}
        />
        <Hours
          name="load_hours"
          label={t.day.form.loadLabel}
          hint={t.day.form.loadHint}
          value={inputs.loadMinutes}
        />
        <Field label={t.day.form.sleptLabel} hint={t.day.form.sleptHint}>
          <Input
            type="number"
            name="sleep_hours"
            defaultValue={inputs.sleepHours || ''}
            min={0}
            max={16}
            step={0.5}
            placeholder="0"
            className="h-9 font-mono tabular-nums"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        {/* Five buttons rather than a number box: the head is the one axis
            with no unit, and asking for it on a scale people can see the whole
            of gets an answer where an empty field gets a shrug. */}
        <fieldset>
          <legend className="text-sm">
            {t.day.form.mentalLabel}{' '}
            <span className="text-muted-foreground">· {t.day.form.mentalHint}</span>
          </legend>
          <div className="mt-1.5 flex gap-1.5">
            {Array.from({ length: AXIS_MAX }, (_, index) => index + 1).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMental(value === mental ? 0 : value)}
                aria-pressed={value === mental}
                title={t.day.detail.mental(value)}
                className={cn(
                  'h-9 flex-1 rounded-lg font-mono text-sm ring-1 transition-colors',
                  value === mental
                    ? 'bg-primary text-primary-foreground ring-primary'
                    : 'ring-foreground/10 hover:bg-muted/40',
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-lg px-3 py-2 text-sm ring-1 ring-foreground/10 transition-colors hover:bg-muted/40">
          <input
            type="checkbox"
            name="lights_out"
            defaultChecked={inputs.lightsOut}
            className="peer sr-only"
          />
          <span className="flex size-4 shrink-0 items-center justify-center rounded border border-foreground/25 text-transparent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
            <Check className="size-3" />
          </span>
          <span className="min-w-0">{t.day.form.lightsOut(LIGHTS_OUT)}</span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton size="sm" pendingLabel={t.common.saving}>
          {t.day.form.submit}
        </SubmitButton>
        {saved && !pending ? (
          <span className="text-sm text-muted-foreground">{t.common.saved}</span>
        ) : null}
        {error ? (
          <span role="alert" className="text-sm text-destructive">
            {error}
          </span>
        ) : null}
      </div>
    </form>
  )
}

function Hours({
  name,
  label,
  hint,
  value,
}: {
  name: string
  label: string
  hint: string
  value: number
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type="number"
        name={name}
        defaultValue={value ? Math.round(value / 30) / 2 : ''}
        min={0}
        max={18}
        step={0.5}
        placeholder="0"
        className="h-9 font-mono tabular-nums"
      />
    </Field>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    // The label block keeps its height whether or not the hint wraps, so a
    // long one does not push its own input half a row below its neighbours.
    <label className="flex flex-col">
      <span className="block min-h-10 text-sm leading-5">
        {label} <span className="text-muted-foreground">· {hint}</span>
      </span>
      <span className="mt-auto block">{children}</span>
    </label>
  )
}
