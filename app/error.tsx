'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

/*
 * Deliberately not translated.
 *
 * This renders when the root layout itself failed, which is the one situation
 * in which the locale provider may not exist — reading the dictionary here
 * would risk a second crash inside the crash screen. Every other error surface
 * in the app is the one below this, app/(app)/error.tsx, and that one speaks
 * the reader's language.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-center">
      <div>
        <p className="text-sm font-semibold text-primary">Something went wrong</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          We could not load this page.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Please try again.</p>
        {/* The digest is the only safe way to correlate this with a server log. */}
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>
        ) : null}
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  )
}
