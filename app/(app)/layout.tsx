import { Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { SidebarIdentity, SidebarIdentitySkeleton } from '@/components/sidebar-identity'

/**
 * Synchronous on purpose. This layout used to await the profile and the full
 * progress analytics before returning anything, which put two Supabase round
 * trips in front of every page in the app — including pages that never used
 * either. Nothing here awaits now, so the shell is in the first flush and the
 * data streams in behind it.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/*
        The wordmark left the app when the sidebar became a 72px rail, and a
        product with no name on screen is a product nobody can refer to. It sits
        above everything rather than inside the rail, which is too narrow to
        hold it.
      */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2.5 border-b border-border/60 bg-background/85 px-4 backdrop-blur sm:px-5">
        <Link href="/dashboard" prefetch className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-3.5" />
          </span>
          <span className="text-base font-semibold tracking-tight">OlympAI</span>
        </Link>
      </header>

      <div className="flex min-h-0 flex-1">
        <AppSidebar
          identity={
            <Suspense fallback={<SidebarIdentitySkeleton />}>
              <SidebarIdentity />
            </Suspense>
          }
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNav />
          <main className="min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
