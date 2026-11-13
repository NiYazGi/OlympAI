'use client'

import { useState, useTransition } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { abandonOrder, buyPlan, payTestOrder, stopRenewal, type BillingResult } from '@/app/(app)/pricing/actions'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'

function useAction() {
  const t = useT()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const run = (action: () => Promise<BillingResult>, after?: () => void) => {
    setError('')
    startTransition(async () => {
      try {
        const result = await action()
        if (result && !result.ok) setError(result.error ?? t('That did not save. Please try again.'))
        else after?.()
      } catch (cause) {
        // A redirect from the action is how it succeeds.
        if (cause && typeof cause === 'object' && 'digest' in cause && String(cause.digest).startsWith('NEXT_REDIRECT')) throw cause
        setError(t('That did not save. Check your connection and try again.'))
      }
    })
  }
  return { pending, error, run }
}

export function BuyButton({ planId, label, variant = 'default' }: { planId: string; label: string; variant?: 'default' | 'outline' }) {
  const { pending, error, run } = useAction()
  return (
    <div className="space-y-1.5">
      <Button className="w-full" size="lg" variant={variant} disabled={pending} onClick={() => run(() => buyPlan(planId))}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {label} <ArrowRight className="size-4" />
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

export function PayTestButton({ orderId, label }: { orderId: string; label: string }) {
  const { pending, error, run } = useAction()
  return (
    <div className="space-y-1.5">
      <Button size="lg" className="w-full" disabled={pending} onClick={() => run(() => payTestOrder(orderId))}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {label}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

export function AbandonButton({ orderId, label }: { orderId: string; label: string }) {
  const { pending, run } = useAction()
  return (
    <Button variant="ghost" className="w-full" disabled={pending} onClick={() => run(() => abandonOrder(orderId))}>
      {label}
    </Button>
  )
}

export function StopRenewalButton({ subscriptionId, label, confirm }: { subscriptionId: string; label: string; confirm: string }) {
  const { pending, error, run } = useAction()
  const [done, setDone] = useState(false)
  if (done) return null
  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => window.confirm(confirm) && run(() => stopRenewal(subscriptionId), () => setDone(true))}
      >
        {label}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
