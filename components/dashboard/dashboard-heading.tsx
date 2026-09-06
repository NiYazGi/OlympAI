'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

function greeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
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

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <p className="min-h-5 text-sm font-medium text-primary">
          {now
            ? now.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
            : ''}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {now ? greeting(now.getHours()) : 'Welcome back'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your next breakthrough is one focused session away.
        </p>
      </div>
      <Button
        variant="outline"
        className="w-full sm:w-auto"
        nativeButton={false}
        render={
          <Link href="/sulu-ai" prefetch>
            <Sparkles className="size-4" /> Ask Sulu AI
          </Link>
        }
      />
    </div>
  )
}
