'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import type { AdminResult } from '@/lib/supabase/admin-guard'

/**
 * One admin action behind one button: an optional confirmation, a spinner
 * while it runs, and its answer underneath. `action` is a server action with
 * its arguments already bound, so a server page can hand one over as is.
 */
export function ActionButton({
  action,
  confirm,
  children,
  variant = 'outline',
  size = 'sm',
  className,
}: {
  action: () => Promise<AdminResult>
  confirm?: string
  children: ReactNode
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
  size?: 'xs' | 'sm' | 'default'
  className?: string
}) {
  const t = useT()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        className={className}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return
          setNotice(null)
          startTransition(async () => {
            try {
              const result = await action()
              setNotice({ ok: result.ok, text: (result.ok ? result.message : result.error) ?? '' })
            } catch (cause) {
              // A redirect from the action is navigation, not a failure.
              if (cause && typeof cause === 'object' && 'digest' in cause && String(cause.digest).startsWith('NEXT_REDIRECT')) throw cause
              setNotice({ ok: false, text: t('That did not save. Check your connection and try again.') })
            }
          })
        }}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {children}
      </Button>
      {notice?.text ? (
        <span role="status" className={notice.ok ? 'text-[11px] text-success' : 'max-w-56 text-[11px] text-coral'}>
          {notice.text}
        </span>
      ) : null}
    </span>
  )
}
