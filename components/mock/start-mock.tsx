'use client'

import { useState, useTransition } from 'react'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { startMock } from '@/app/(app)/mock/actions'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'

export function StartMock({
  subject,
  disabled,
  label,
}: {
  subject: string
  disabled?: boolean
  label?: string
}) {
  const t = useT()

  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-2">
      <Button
        disabled={pending || disabled}
        onClick={() => {
          setError('')
          startTransition(async () => {
            const result = await startMock(subject)
            if (!result.ok) setError(result.error ?? t('The test could not be started.'))
          })
        }}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> {t('Preparing…')}
          </>
        ) : (
          <>
            <ClipboardCheck className="size-4" /> {label ?? t('Start a {subject} mock', { subject })}
          </>
        )}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
