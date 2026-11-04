'use client'

import { useState, useTransition } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { setAdmin } from '@/app/(app)/admin/actions'
import { cn } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'

export function AdminToggle({ userId, isAdmin, isSelf }: { userId: string; isAdmin: boolean; isSelf: boolean }) {
  const t = useT()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !isAdmin
    if (!window.confirm(next ? t('Give this user full admin access?') : t('Remove admin access from this user?'))) return
    setError(null)
    startTransition(async () => {
      const result = await setAdmin(userId, next)
      if (!result.ok) setError(result.error ?? t('That did not save.'))
    })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending || (isSelf && isAdmin)}
        title={isSelf && isAdmin ? t('You cannot remove your own admin access') : undefined}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed',
          isAdmin
            ? 'bg-coral/10 text-coral hover:bg-coral/15 disabled:hover:bg-coral/10'
            : 'bg-foreground/[0.05] text-ash shadow-key hover:bg-foreground/[0.08] hover:text-foreground',
        )}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : isAdmin ? <ShieldCheck className="size-3.5" /> : null}
        {isAdmin ? t('Admin') : t('Make admin')}
      </button>
      {error ? <p className="max-w-48 text-[11px] text-coral">{error}</p> : null}
    </div>
  )
}
