import { Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BrandMark } from '@/components/brand-mark'
import { AdminRailLink, AppSidebar } from '@/components/app-sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { SidebarIdentity, SidebarIdentitySkeleton } from '@/components/sidebar-identity'
import { TooltipProvider } from '@/components/ui/tooltip'
import { isCurrentUserAdmin } from '@/lib/supabase/admin-guard'
import { getSessionUser } from '@/lib/db/auth'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n/server'
import { LanguageSwitcher } from '@/components/language-switcher'
import { FlameGate } from '@/components/flame/flame-gate'
import { TourGate } from '@/components/tour/tour-gate'
import { AnnouncementBar } from '@/components/announcement-bar'
import { getLiveAnnouncement } from '@/lib/admin/settings'

/**
 * Awaits only the session — one in-process lookup — and the locale. This
 * layout used to await the profile and the full progress analytics before
 * returning anything, which put two Supabase round trips in front of every
 * page in the app — including pages that never used either. The shell is in
 * the first flush and the data streams in behind it.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  // The proxy only sees that a session cookie exists. An expired or unknown one
  // (after the database was reset, say) is caught here and sent to log in,
  // rather than rendering an empty app.
  if (!(await getSessionUser())) redirect('/login')
  const [t, profile, inClass] = await Promise.all([getT(), getCurrentProfile(), isInClass()])
  // Which kind of account decides the navigation: one indexed read, in-process.
  const role = profile?.role === 'teacher' ? 'teacher' : 'student'

  return (
    // Tooltips only exist on the app's icon rail, so their provider lives here
    // rather than in the root layout, keeping it off the public pages.
    <TooltipProvider delay={200}>
      <div className="app-calm flex min-h-dvh flex-col bg-void">
        {/*
          The wordmark left the app when the sidebar became a 72px rail, and a
          product with no name on screen is a product nobody can refer to. It sits
          above everything rather than inside the rail, which is too narrow to
          hold it.
        */}
        <header className="glass sticky top-0 z-30 hidden h-14 shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-4 sm:px-5 md:flex">
          <Link href={role === 'teacher' ? '/class' : '/dashboard'} prefetch aria-label={t('OlympAI dashboard')}>
            <BrandMark />
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            {/* Days in a row the app was opened, and the guided tour behind
                the "?". Each under its own Suspense: they read the profile,
                and the shell paints without waiting. */}
            <Suspense fallback={null}>
              <FlameGate />
            </Suspense>
            <Suspense fallback={null}>
              <TourGate />
            </Suspense>
            <LanguageSwitcher />
          </div>
        </header>

        <Suspense fallback={null}>
          <Announcement />
        </Suspense>

        <div className="flex min-h-0 flex-1">
          <AppSidebar
            identity={
              <Suspense fallback={<SidebarIdentitySkeleton />}>
                <SidebarIdentity />
              </Suspense>
            }
            admin={
              <Suspense fallback={null}>
                <AdminEntry />
              </Suspense>
            }
            role={role}
            inClass={inClass}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileNav role={role} inClass={inClass} />
            <main className="page-in min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
              {children}
            </main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

async function AdminEntry() {
  return (await isCurrentUserAdmin()) ? <AdminRailLink /> : null
}

/** The admin's banner, when one is set (Admin → Settings). */
async function Announcement() {
  const announcement = await getLiveAnnouncement()
  return announcement ? <AnnouncementBar text={announcement.text} tone={announcement.tone} /> : null
}

/** Whether this student has joined a class, for the Class entry in the navigation. */
async function isInClass() {
  const user = await getSessionUser()
  if (!user) return false
  const supabase = await createClient()
  const { count } = await supabase
    .from('class_members')
    .select('class_id', { count: 'exact', head: true })
    .eq('student_id', user.id)
  return Boolean(count)
}
