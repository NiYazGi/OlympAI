'use client'

import type { ComponentProps, ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * A submit button that knows its form is on its way.
 *
 * Signing in, signing out and saving a password all post to a server action
 * and then redirect, and until the redirect lands the page used to look
 * exactly as it did before the click — so people clicked again.
 *
 * `action` narrows the pending state to one submitter when a form has two:
 * the login form also posts "Forgot password?", and only the button that was
 * pressed should say it is working.
 */
export function SubmitButton({
  children,
  pendingLabel,
  action,
  ...props
}: Omit<ComponentProps<typeof Button>, 'type'> & {
  pendingLabel: ReactNode
  action?: (formData: FormData) => unknown
}) {
  const status = useFormStatus()
  const pending = status.pending && (!action || status.action === action)

  return (
    <Button {...props} type="submit" disabled={status.pending || props.disabled}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
