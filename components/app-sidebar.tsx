'use client'

import { ViewTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'
import { BrandMark } from '@/components/brand-mark'

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
  { href: '/sulu-ai', label: 'Sulu AI', icon: MessageCircle },
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

/** Full-height navigation with visible labels and the account anchored below. */
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
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex lg:w-64">
      <Link
        href={role === 'teacher' ? '/class' : '/dashboard'}
        aria-label={t('OlympAI dashboard')}
        className="flex h-20 shrink-0 items-center px-6 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <BrandMark large />
      </Link>

      <nav aria-label={t('Main')} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-5 pt-2">
        <div className="flex flex-col gap-0.5">
          {navItemsFor(role, inClass).map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              label={t(item.label)}
              active={isNavActive(item, pathname)}
            >
              <item.icon className="size-5" strokeWidth={1.75} />
            </SidebarLink>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-0.5 pt-8">
          {admin}
          <SidebarLink href="/settings" label={t('Settings')} active={isActive('/settings')}>
            <Settings className="size-5" strokeWidth={1.75} />
          </SidebarLink>
        </div>
      </nav>
      <div className="shrink-0 border-t border-sidebar-border px-3 py-4">{identity}</div>
    </aside>
  )
}

/** Rendered only for admins, by a server component that checked the flag. */
export function AdminSidebarLink() {
  const t = useT()

  const pathname = usePathname()
  return (
    <SidebarLink
      href="/admin"
      label={t('Admin')}
      active={pathname === '/admin' || pathname.startsWith('/admin/')}
    >
      <ShieldCheck className="size-5" strokeWidth={1.75} />
    </SidebarLink>
  )
}

export function SidebarAccountLink({ name, children }: { name: string; children: ReactNode }) {
  const t = useT()
  const pathname = usePathname()
  return (
    <SidebarLink
      href="/me"
      label={t('My account')}
      description={name}
      active={['/me', '/profile', '/progress'].some((href) => isNavActive({ href }, pathname))}
      account
    >
      {children}
    </SidebarLink>
  )
}

function SidebarLink({
  href,
  label,
  active,
  children,
  description,
  account = false,
}: {
  href: string
  label: string
  active: boolean
  children: ReactNode
  description?: string
  account?: boolean
}) {
  return (
    <Link
      href={href}
      prefetch
      data-tour={`nav:${href}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-sidebar-accent text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground',
        account && 'gap-3 px-3',
      )}
    >
      {active && !account ? (
        <ViewTransition name="rail-active" share="morph" default="none">
          <span aria-hidden className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-coral" />
        </ViewTransition>
      ) : null}
      <span className="relative flex shrink-0 items-center justify-center" aria-hidden>{children}</span>
      <span className="relative min-w-0 flex-1 text-left text-[15px] leading-5 font-medium">
        {label}
        {description ? <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{description}</span> : null}
      </span>
      {account ? <ChevronRight className="relative size-4 shrink-0 opacity-60" aria-hidden /> : null}
    </Link>
  )
}
