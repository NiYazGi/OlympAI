'use client'

import { useActionState } from 'react'
import { Loader2 } from 'lucide-react'
import { enterGate } from '@/app/gate/actions'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import { fieldClass } from '@/lib/utils'

export function GateForm({ next }: { next: string }) {
  const t = useT()
  const [state, action, pending] = useActionState(enterGate, { error: false })
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">{t('Password')}</span>
        <input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className={fieldClass}
          aria-invalid={state.error || undefined}
        />
      </label>
      {state.error ? <p className="text-sm text-destructive">{t('Wrong password.')}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {t('Enter')}
      </Button>
    </form>
  )
}
