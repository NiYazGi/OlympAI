import { Suspense, type ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AdminSidebarLink, AppSidebar } from '@/components/app-sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { SidebarIdentity, SidebarIdentitySkeleton } from '@/components/sidebar-identity'
import { TooltipProvider } from '@/components/ui/tooltip'
import { isCurrentUserAdmin } from '@/lib/supabase/admin-guard'
import { getSessionUser } from '@/lib/db/auth'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
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
  const [profile, inClass] = await Promise.all([getCurrentProfile(), isInClass()])
  // Which kind of account decides the navigation: one indexed read, in-process.
  const role = profile?.role === 'teacher' ? 'teacher' : 'student'

  return (
    <TooltipProvider delay={200}>
      <div className="app-calm flex min-h-dvh bg-background">
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
          <header className="hidden h-20 shrink-0 items-center justify-end gap-1.5 px-8 md:flex">
            <Suspense fallback={null}>
              <FlameGate />
            </Suspense>
            <Suspense fallback={null}>
              <TourGate />
            </Suspense>
            <ThemeToggle />
            <LanguageSwitcher />
          </header>
          <MobileNav role={role} inClass={inClass} />
          <Suspense fallback={null}>
            <Announcement />
          </Suspense>
          <main className="page-in min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}

async function AdminEntry() {
  return (await isCurrentUserAdmin()) ? <AdminSidebarLink /> : null
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
