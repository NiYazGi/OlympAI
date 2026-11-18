'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { abandonMock } from '@/app/(app)/mock/actions'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'

/** Closes an unfinished paper so a new one can start. Nothing is graded. */
export function AbandonMock({ id }: { id: string }) {
  const t = useT()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t('Close this paper without handing it in? It will not be graded, and you can start a new one.'))) return
          start(async () => {
            const result = await abandonMock(id)
            if (!result.ok) setError(result.error ?? '')
            else router.refresh()
          })
        }}
      >
        <XCircle className="size-4" /> {t('Close without handing in')}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  )
}
