'use client'

import { useState, useTransition } from 'react'
import { Check, Settings2 } from 'lucide-react'
import { saveProfilePreferences } from '@/app/(app)/me/actions'
import { GOALS, INTENSITIES, LEVELS, SUBJECTS } from '@/lib/profile-options'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'

type Choice = { field: string; label: string; options: readonly string[] }

const SECTIONS: Choice[] = [
  { field: 'primary_subject', label: 'Primary subject', options: SUBJECTS },
  { field: 'level', label: 'Current level', options: LEVELS },
  { field: 'goal', label: 'Current goal', options: GOALS },
  { field: 'training_intensity', label: 'Training rhythm', options: INTENSITIES },
]

export function ProfilePreferences({
  initial,
}: {
  initial: Partial<Record<string, string | null>>
}) {
  const t = useT()

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      SECTIONS.map((section) => [
        section.field,
        initial[section.field] ?? section.options[0]!,
      ]),
    ),
  )
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function save() {
    const formData = new FormData()
    for (const [field, value] of Object.entries(values)) formData.set(field, value)
    startTransition(async () => {
      const result = await saveProfilePreferences(formData)
      if (result.ok) {
        setStatus('saved')
        setError('')
      } else {
        setStatus('error')
        setError(result.error ?? t('Your preferences could not be saved.'))
      }
    })
  }

  return (
    <section className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">{t('Training preferences')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('These drive your weekly plan and how Sulu pitches its hints.')}
          </p>
        </div>
        <Settings2 className="size-5 shrink-0 text-muted-foreground" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <fieldset key={section.field}>
            <legend className="eyebrow">
              {t(section.label)}
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
                        : 'border-border hover:border-white/20',
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
                    {t(option)}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {status === 'error' ? (
        <p role="alert" className="mt-4 rounded-lg bg-ember/60 p-3 text-sm text-[#ffb3b3] shadow-key">
          {error}
        </p>
      ) : null}

      <Button className="mt-6 w-full sm:w-auto" onClick={save} disabled={pending}>
        {pending ? t('Saving…') : status === 'saved' ? t('Preferences saved') : t('Save preferences')}
      </Button>
    </section>
  )
}
