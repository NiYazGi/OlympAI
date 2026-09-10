'use client'

import { useState, useTransition } from 'react'
import { setRegistration } from '@/app/(app)/olympiads/actions'
import { Button } from '@/components/ui/button'

/**
 * This marks a competition as one you are following, inside OlympAI. It does
 * not enter you for anything, and it used to be labelled "Register" with a
 * "Registered" badge beside a link to the organiser's site — which is exactly
 * how a student comes to believe they have applied when they have not. Entering
 * happens on the official page and nowhere else.
 *
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
        {pending ? 'Saving…' : registered ? 'Stop tracking' : 'Track this one'}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
