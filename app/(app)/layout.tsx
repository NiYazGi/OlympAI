import { Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileNavForRole } from '@/components/mobile-nav-for-role'
import { RailLinksSkeleton } from '@/components/rail-links'
import { RailNav } from '@/components/rail-nav'
import { SidebarIdentity, SidebarIdentitySkeleton } from '@/components/sidebar-identity'
import { LocaleToggle } from '@/components/locale-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { TourGate } from '@/components/tour/tour-gate'
import { FlameGate } from '@/components/flame/flame-gate'

/**
 * Synchronous on purpose. This layout used to await the profile and the full
 * progress analytics before returning anything, which put two Supabase round
 * trips in front of every page in the app — including pages that never used
 * either. Nothing here awaits now, so the shell is in the first flush and the
 * data streams in behind it.
 *
 * On a laptop the whole frame is the board-green rail on the left: the name,
 * the sections with their labels, the account and the four small controls. The
 * page beside it starts at the top edge, with no bar above it. A phone has no
 * room for a rail, so it gets a slim bar with the name and the controls, and
 * the sections move to a tab bar at the bottom.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const controls = (
    <>
      {/* Days in a row the app was opened; opening it is what records one. */}
      <Suspense fallback={null}>
        <FlameGate />
      </Suspense>
      {/* The "?" and the guided tour behind it. Under its own Suspense: it
          reads the profile, and the shell paints without waiting. */}
      <Suspense fallback={null}>
        <TourGate />
      </Suspense>
      <LocaleToggle />
      <ThemeToggle />
    </>
  )

  return (
    <div className="flex min-h-dvh">
      <AppSidebar
        identity={
          <Suspense fallback={<SidebarIdentitySkeleton />}>
            <SidebarIdentity />
          </Suspense>
        }
        nav={
          <Suspense fallback={<RailLinksSkeleton />}>
            <RailNav />
          </Suspense>
        }
        controls={controls}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4 md:hidden">
          <Link
            href="/dashboard"
            prefetch
            className="flex items-center font-display text-xl font-extrabold tracking-[-0.01em] pointer-coarse:min-h-11"
          >
            OlympAI
          </Link>
          <div className="ml-auto flex items-center gap-0.5">{controls}</div>
        </header>
        <Suspense fallback={null}>
          <MobileNavForRole />
        </Suspense>
        <main className="min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>
    </div>
  )
}
