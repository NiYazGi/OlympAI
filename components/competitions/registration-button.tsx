'use client'

import { useState, useTransition } from 'react'
import { setRegistration } from '@/app/(app)/olympiads/actions'
import { Button } from '@/components/ui/button'

/**
 * Registration is a real row now. The button used to be a `<Button>` with no
 * onClick, sitting next to a hard-coded "Registered" badge.
 */
export function RegistrationButton({
  competitionId,
  registered,
}: {
  competitionId: string
  registered: boolean
}) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function toggle() {
    setError('')
    startTransition(async () => {
      const result = await setRegistration(competitionId, !registered)
      if (!result.ok) setError(result.error ?? 'That did not go through.')
    })
  }

  return (
    <div className="space-y-2">
      <Button
        variant={registered ? 'outline' : 'default'}
        className="w-full"
        onClick={toggle}
        disabled={pending}
      >
        {pending ? 'Saving…' : registered ? 'Cancel registration' : 'Register'}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
