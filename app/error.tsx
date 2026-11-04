'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useT()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-void p-6 text-center">
      <div className="enter">
        <p className="eyebrow">{t('Something went wrong')}</p>
        <h1 className="mt-4 text-[32px] font-normal text-foreground">
          {t('We could not load this page.')}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{t('Please try again.')}</p>
        {/* The digest is the only safe way to correlate this with a server log. */}
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">{t('Ref:')} {error.digest}</p>
        ) : null}
        <Button className="mt-6" onClick={reset}>
          {t('Try again')}
        </Button>
      </div>
    </main>
  )
}
