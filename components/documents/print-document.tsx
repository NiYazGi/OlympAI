'use client'

import { useEffect } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Print button; with `auto`, opens the dialog once the page has drawn. */
export function PrintDocument({ auto, label }: { auto?: boolean; label: string }) {
  useEffect(() => {
    if (!auto) return
    const timer = window.setTimeout(() => {
      window.print()
      // Reloading should not print again.
      window.history.replaceState(null, '', window.location.pathname)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [auto])
  return (
    <Button onClick={() => window.print()}>
      <Printer className="size-4" /> {label}
    </Button>
  )
}
