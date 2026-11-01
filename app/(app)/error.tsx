'use client'

import { useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import { cardClass, cn } from '@/lib/utils'

/**
 * An error inside the app, shown inside the app.
 *
 * The root error page replaces everything, navigation included, so a failed
 * query on one screen looked like the whole product had fallen over and left
 * no way out of it but the browser's back button. This keeps the rail, the tab
 * bar and the header, because they still work.
 */
export default function AppError({
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
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <section className={cn(cardClass, 'disclose p-6 sm:p-8')}>
        <p className="text-sm font-semibold text-primary">{t.errors.somethingWrong}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.errors.pageDidNotLoad}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.errors.nothingLost}</p>
        {/* The digest is the only safe way to correlate this with a server log. */}
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {t.errors.ref}: {error.digest}
          </p>
        ) : null}
        <Button className="mt-6" onClick={reset}>
          <RotateCcw className="size-4" /> {t.errors.tryAgain}
        </Button>
      </section>
    </div>
  )
}
