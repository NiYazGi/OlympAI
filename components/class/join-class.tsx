'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { joinClass } from '@/app/(app)/class/actions'
import { useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * The student's half of an invitation.
 *
 * The same component serves the code box on /class and the Join button on an
 * invite link, which is why the code is a controlled value: on the invite page
 * it arrives filled in and read-only, and there is nothing to type.
 */
export function JoinClass({
  code: initial = '',
  locked = false,
  redirectTo,
}: {
  code?: string
  /** The code came from the link, so it is shown rather than asked for. */
  locked?: boolean
  redirectTo?: string
}) {
  const t = useT()
  const router = useRouter()
  const [code, setCode] = useState(initial)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    setError('')
    startTransition(async () => {
      try {
        const result = await joinClass(formData)
        if (!result.ok) {
          setError(result.error ?? t.common.notSaved)
          return
        }
        if (redirectTo) router.push(redirectTo)
        else router.refresh()
      } catch {
        setError(t.common.offline)
      }
    })
  }

  return (
    <form action={submit} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          readOnly={locked}
          required
          maxLength={9}
          autoComplete="off"
          spellCheck={false}
          aria-label={t.classes.code}
          placeholder={t.classes.joinPlaceholder}
          className={cn(
            'h-10 w-40 rounded-lg border border-input bg-background px-3 font-mono text-base tracking-[0.2em] uppercase outline-none focus:border-primary focus:ring-3 focus:ring-primary/15',
            locked && 'bg-muted',
          )}
        />
        <Button type="submit" size="lg" disabled={pending || code.length < 6}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? t.classes.joining : t.classes.join}
          {pending ? null : <ArrowRight className="size-4" />}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}
