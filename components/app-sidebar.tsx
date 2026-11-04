'use client'

import { ViewTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'

export type Role = 'student' | 'teacher'

/**
 * Where each kind of account can go. A teacher's app is not a student's app
 * with one page added: their own XP, a plan for their own target and a paper
 * to sit answer questions a teacher is not asking. The subjects and the
 * problem bank stay, because looking something up before a lesson is the
 * point of having a library.
 */
type NavItem = { href: string; label: string; icon: typeof BookOpen; also?: string[] }

/**
 * Six places, not eight. Plan, Path, the study plan and the method are all
 * "the route to my olympiad", so they light up Learn instead of each taking a
 * slot of their own; the pages themselves are unchanged. Class is only there
 * for a student who is in one: for everyone else it was an empty page with a
 * code box, and the teacher's invite link is how a class is joined.
 */
const studentItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/learn', label: 'Learn', icon: GraduationCap, also: ['/plan', '/path', '/study-plan', '/method'] },
  { href: '/tasks', label: 'Problems', icon: BookOpen },
  { href: '/mock', label: 'Mock tests', icon: ClipboardCheck },
  { href: '/sulu-ai', label: 'Sulu AI', icon: Sparkles },
  { href: '/olympiads', label: 'Olympiads', icon: Trophy },
]

const classItem: NavItem = { href: '/class', label: 'Class', icon: Users }

const teacherItems: NavItem[] = [
  { href: '/class', label: 'Classes', icon: Users },
  { href: '/learn', label: 'Learn', icon: GraduationCap },
  { href: '/tasks', label: 'Problems', icon: BookOpen },
  { href: '/olympiads', label: 'Olympiads', icon: Trophy },
]

export function navItemsFor(role: Role, inClass = false) {
  if (role === 'teacher') return teacherItems
  return inClass ? [...studentItems, classItem] : studentItems
}

/** Whether a nav item is the current page, counting the pages it stands for. */
export function isNavActive(item: { href: string; also?: string[] }, pathname: string) {
  return [item.href, ...(item.also ?? [])].some((href) => pathname === href || pathname.startsWith(`${href}/`))
}

/**
 * A floating rail of icons with their names under them. It was icon-only with
 * tooltips, which made a newcomer hover each one to find anything. The account sits at the top as
 * an avatar, which doubles as the link to /me — the same place the labelled
 * entry used to point.
 */
export function AppSidebar({
  identity,
  admin,
  role = 'student',
  inClass = false,
}: {
  identity: ReactNode
  admin?: ReactNode
  role?: Role
  inClass?: boolean
}) {
  const t = useT()

  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <div className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 items-center p-4 md:flex">
      {/* Sized to its contents and centred, so it reads as a capsule floating
          over the page rather than a column bolted to the edge. Lighter than
          the background, not darker, for the same reason. */}
      <nav
        aria-label={t('Main')}
        className="flex w-[5.5rem] flex-col items-center gap-2 rounded-[22px] bg-ink py-4 shadow-key-strong"
      >
        {identity}

        <div className="mt-3 flex flex-col items-center gap-1 border-t border-white/[0.06] pt-3">
          {navItemsFor(role, inClass).map((item) => (
            <RailLink
              key={item.href}
              href={item.href}
              label={t(item.label)}
              active={isNavActive(item, pathname)}
            >
              <item.icon className="size-[18px]" />
            </RailLink>
          ))}
        </div>

        <div className="mt-3 flex flex-col items-center gap-1 border-t border-white/[0.06] pt-3">
          {admin}
          <RailLink href="/settings" label={t('Settings')} active={isActive('/settings')}>
            <Settings className="size-[18px]" />
          </RailLink>
        </div>
      </nav>
    </div>
  )
}

/** Rendered only for admins, by a server component that checked the flag. */
export function AdminRailLink() {
  const t = useT()

  const pathname = usePathname()
  return (
    <RailLink
      href="/admin"
      label={t('Admin')}
      active={pathname === '/admin' || pathname.startsWith('/admin/')}
    >
      <ShieldCheck className="size-[18px]" />
    </RailLink>
  )
}

function RailLink({
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
  // Labelled, not icon-only: a newcomer should not have to hover each icon to
  // learn where problems or their history live.
  return (
    <Link
      href={href}
      prefetch
      data-tour={`nav:${href}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex w-[4.75rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-colors duration-200',
        active ? 'text-white' : 'text-smoke hover:bg-white/[0.06] hover:text-white',
      )}
    >
      {/* One ring for the whole rail, not a border per link. Because the
                element carries the same view-transition name wherever it lands,
                the browser animates it from the item you left to the item you
                opened — the indicator travels instead of blinking out here and
                reappearing there. */}
      {active ? (
        <ViewTransition name="rail-active" share="morph" default="none">
          <span
            aria-hidden
            className="absolute inset-0 rounded-xl bg-white/[0.08] shadow-[rgba(255,255,255,0.08)_0_1px_0_inset,rgba(255,255,255,0.14)_0_0_0_1px]"
          />
        </ViewTransition>
      ) : null}
      <span className="relative">{children}</span>
      <span className="relative text-center text-[11px] leading-tight font-medium">{label}</span>
    </Link>
  )
}
