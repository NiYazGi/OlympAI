'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Settings2 } from 'lucide-react'
import { saveProfilePreferences } from '@/app/(app)/me/actions'
import { GOALS, INTENSITIES, LEVELS, SUBJECTS } from '@/lib/profile-options'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

type Choice = { field: string; labelKey: string; options: readonly string[] }

const SECTIONS: Choice[] = [
  { field: 'primary_subject', labelKey: 'primarySubject', options: SUBJECTS },
  { field: 'level', labelKey: 'currentLevel', options: LEVELS },
  { field: 'goal', labelKey: 'currentGoal', options: GOALS },
  { field: 'training_intensity', labelKey: 'trainingRhythm', options: INTENSITIES },
]

export function ProfilePreferences({
  initial,
}: {
  initial: Partial<Record<string, string | null>>
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      SECTIONS.map((section) => [section.field, initial[section.field] ?? section.options[0]!]),
    ),
  )
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const t = useT()

  function save() {
    const formData = new FormData()
    for (const [field, value] of Object.entries(values)) formData.set(field, value)
    startTransition(async () => {
      try {
        const result = await saveProfilePreferences(formData)
        if (result.ok) {
          setStatus('saved')
          setError('')
        } else {
          setStatus('error')
          setError(result.error ?? t.settings.prefsFailed)
        }
      } catch {
        setStatus('error')
        setError(t.common.offline)
      }
    })
  }

  return (
    <section className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Training preferences</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These drive your weekly plan and how Sulu pitches its hints.
          </p>
        </div>
        <Settings2 className="size-5 shrink-0 text-muted-foreground" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <fieldset key={section.field}>
            <legend className="text-caption font-semibold text-muted-foreground">
              {t.settings[section.labelKey as 'primarySubject']}
            </legend>
            <div className="mt-3 grid gap-2">
              {section.options.map((option) => {
                const active = values[section.field] === option
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setValues((current) => ({ ...current, [section.field]: option }))
                      setStatus('idle')
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                      active
                        ? 'border-primary/40 bg-accent text-primary'
                        : 'border-border hover:border-primary/40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full border',
                        active && 'border-primary bg-primary text-white',
                      )}
                    >
                      {active ? <Check className="size-3" /> : null}
                    </span>
                    {t.subjects[option] ?? t.options[option] ?? option}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {status === 'error' ? (
        <p
          role="alert"
          className="disclose mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <Button className="mt-6 w-full sm:w-auto" onClick={save} disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Saving…
          </>
        ) : status === 'saved' ? (
          <>
            <Check className="size-4" /> Preferences saved
          </>
        ) : (
          t.settings.savePreferences
        )}
      </Button>
    </section>
  )
}
