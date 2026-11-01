'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale, useT } from '@/components/i18n-provider'
import type { Dictionary } from '@/lib/i18n/dictionaries'

function greeting(hour: number, t: Dictionary) {
  if (hour < 12) return t.dashboard.morning
  if (hour < 18) return t.dashboard.afternoon
  return t.dashboard.evening
}

// Never emits, so the snapshot is read once per render pass and both snapshots
// are primitives — no cascading renders, and no hydration mismatch.
const neverChanges = () => () => {}
const onClient = () => true
const onServer = () => false

/**
 * Renders without waiting on any data, so it belongs to the first paint.
 *
 * The date and greeting resolve after hydration rather than on the server,
 * which also fixes a smaller bug: computed server-side they showed the server's
 * timezone, not the student's.
 */
export function DashboardHeading() {
  const hydrated = useSyncExternalStore(neverChanges, onClient, onServer)
  const now = hydrated ? new Date() : null
  const t = useT()
  const locale = useLocale()

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <p className="min-h-5 text-caption font-semibold text-muted-foreground">
          {now
            ? now.toLocaleDateString(locale, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
            : ''}
        </p>
        <h1 className="font-display text-page font-bold tracking-[-0.02em]">
          {now ? greeting(now.getHours(), t) : t.dashboard.welcome}
        </h1>
      </div>
      <Button
        variant="outline"
        className="w-full sm:w-auto"
        nativeButton={false}
        render={
          <Link href="/sulu-ai" prefetch>
            <Sparkles className="size-4" /> {t.dashboard.askSulu}
          </Link>
        }
      />
    </div>
  )
}
