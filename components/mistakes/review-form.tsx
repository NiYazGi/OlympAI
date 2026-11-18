'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { submitReview } from '@/app/(app)/mistakes/actions'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import { cn, fieldClass } from '@/lib/utils'

const REASONS: { id: string; label: string }[] = [
  { id: 'knowledge', label: 'Did not know the fact or formula' },
  { id: 'method', label: 'Chose the wrong method' },
  { id: 'calculation', label: 'Calculation or algebra slip' },
  { id: 'presentation', label: 'Right idea, missing justification' },
  { id: 'reading', label: 'Misread the statement' },
  { id: 'time', label: 'Ran out of time' },
  { id: 'other', label: 'Something else' },
]

/** Why it happened, in the student's words; then a similar problem to solve alone. */
export function MistakeReviewForm({ entryId }: { entryId: string }) {
  const t = useT()
  const router = useRouter()
  const [reason, setReason] = useState('method')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        setError('')
        start(async () => {
          const result = await submitReview(entryId, reason, note)
          if (!result.ok) setError(result.error)
          else router.refresh()
        })
      }}
    >
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setReason(item.id)}
            className={cn('rounded-full border px-3 py-1 text-xs', reason === item.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-foreground/[0.04]')}
          >
            {t(item.label)}
          </button>
        ))}
      </div>
      <textarea
        className={cn(fieldClass, 'min-h-20 py-2')}
        maxLength={1000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t('What went wrong, and what is the right step? In your own words.')}
      />
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {t('Reviewed — give me a check problem')}
      </Button>
    </form>
  )
}
