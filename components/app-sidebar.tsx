'use client'

import { ViewTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useT } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

/**
 * The rail: a board-green column with every section written out.
 *
 * It replaces a floating capsule of bare icons, which needed a tooltip on every
 * target to be read at all. Labels cost 170px of width and give back a
 * navigation that can be scanned. Inside the rail the colour tokens are
 * re-pointed at the board (see `.rail-scope` in globals.css), so the controls
 * at the bottom keep their own markup and still read on green.
 */
export function AppSidebar({
  identity,
  nav,
  controls,
}: {
  identity: ReactNode
  nav: ReactNode
  controls: ReactNode
}) {
  const t = useT()

  return (
    <div className="rail-scope sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <Link
        href="/dashboard"
        prefetch
        className="mx-3 mt-5 mb-5 block px-3 font-display text-[1.4375rem] leading-7 font-extrabold tracking-[-0.01em]"
      >
        OlympAI
      </Link>

      {/* The destinations depend on which kind of account this is, which
          means a database read, which the shell deliberately does not wait
          for. So the rail is handed its links from a Suspense boundary and
          paints the frame first. */}
      <nav aria-label={t.nav.main} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3">
        {nav}
      </nav>

      <div className="flex flex-col gap-2 border-t border-sidebar-border px-3 pt-3 pb-4">
        {identity}
        <div className="flex items-center gap-0.5 px-1">{controls}</div>
      </div>
    </div>
  )
}

export function RailLink({
  href,
  label,
  active,
  children,
}: {
  href: string
  label: string
  active: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? 'page' : undefined}
      data-tour={`nav:${href}`}
      className={cn(
        'relative flex min-h-10 items-center gap-3 rounded-sm px-3 font-display text-base leading-5 transition-colors duration-150',
        active
          ? 'bg-sidebar-accent font-bold text-sidebar-foreground'
          : 'font-semibold text-sidebar-foreground/90 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
      )}
    >
      {/* One marker for the whole rail. It carries the same view-transition
          name wherever it lands, so the browser moves it from the item you
          left to the item you opened instead of blinking it out and in. */}
      {active ? (
        <ViewTransition name="rail-active" share="morph" default="none">
          <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-sidebar-primary" />
        </ViewTransition>
      ) : null}
      {children}
      {label}
    </Link>
  )
}
