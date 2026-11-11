'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'

/**
 * A sheet to solve on paper. The print stylesheet keeps the statement and
 * drops the navigation, the editor and the chat (see `.print-hide`).
 */
export function PrintButton({ label }: { label?: string }) {
  const t = useT()
  return (
    <Button variant="outline" size="sm" className="print-hide" onClick={() => window.print()}>
      <Printer className="size-4" /> {label ?? t('Print')}
    </Button>
  )
}
