'use client'

import { useState, useTransition } from 'react'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { startMock } from '@/app/(app)/mock/actions'
import { useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'

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
            try {
              const result = await startMock(subject)
              if (!result.ok) setError(result.error ?? t.exam.notStarted)
            } catch {
              setError(t.common.offline)
            }
          })
        }}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Preparing…
          </>
        ) : (
          <>
            <ClipboardCheck className="size-4" /> {label ?? `Start a ${subject} mock`}
          </>
        )}
      </Button>
      {error ? (
        <p role="alert" className="disclose text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
