'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { finishPreparationReview } from '@/app/(app)/plan/actions'
import { useT } from '@/components/i18n-provider'
import { Button, buttonVariants } from '@/components/ui/button'

export function PreparationMockReview({ id, reviewed, hasMistakes }: { id: string; reviewed: boolean; hasMistakes: boolean }) {
  const t = useT()
  const [result, complete, pending] = useActionState(finishPreparationReview, null)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasMistakes && !reviewed && !result?.ok ? (
        <form action={complete}>
          <input type="hidden" name="mock_id" value={id} />
          <Button type="submit" disabled={pending}>{t('Mark review complete')}</Button>
        </form>
      ) : null}
      <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>{t('Back to preparation route')}</Link>
      {result?.error ? <p role="alert" className="text-sm text-destructive">{result.error}</p> : null}
    </div>
  )
}
