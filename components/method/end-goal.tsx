'use client'

import { useState, useTransition } from 'react'
import { setTargetUniversity } from '@/app/(app)/path/actions'
import { useT } from '@/components/i18n-provider'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/submit-button'

/**
 * The last question on the page, and the one the other seven are for.
 *
 * Free text, and it shows up on the dashboard under the competition. A student
 * who has written down what the medal is a means to has something to read on
 * the evenings when the medal is not enough of a reason.
 */
export function EndGoal({ current }: { current: string | null }) {
  const t = useT()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  function submit(formData: FormData) {
    setError('')
    setSaved(false)
    startTransition(async () => {
      try {
        const result = await setTargetUniversity(formData)
        if (result.ok) setSaved(true)
        else setError(result.error ?? t('That did not save. Please try again.'))
      } catch {
        setError(t('That did not save. Check your connection and try again.'))
      }
    })
  }

  return (
    <form action={submit} className="mt-4 flex flex-wrap items-center gap-2">
      <Input
        name="target_university"
        defaultValue={current ?? ''}
        placeholder={t('The place this is for')}
        maxLength={120}
        className="h-9 max-w-xs"
      />
      <SubmitButton size="sm" variant="outline" pendingLabel={t('Saving')}>
        {t('Save')}
      </SubmitButton>
      {saved ? <span className="text-sm text-muted-foreground">{t('Saved.')}</span> : null}
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </form>
  )
}
