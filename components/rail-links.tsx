'use client'

import { usePathname } from 'next/navigation'
import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Route,
  Settings,
  MessageCircle,
  Flag,
  Users,
} from 'lucide-react'
import { RailLink } from '@/components/app-sidebar'
import { useT } from '@/components/i18n-provider'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import { cn } from '@/lib/utils'

export type Role = 'student' | 'teacher'

/**
 * Where each kind of account can go.
 *
 * A teacher's app is not a student's app with one page added. A dashboard of
 * their own XP, a plan for their own target and a timed paper to sit are all
 * answers to questions a teacher is not asking, so they are not in their rail
 * — the subjects and the problem bank are, because a teacher looking something
 * up before a lesson is the whole point of having a library.
 *
 * Students keep Classes: one of them is in a class, or will be handed a code.
 */
const studentItems = (t: Dictionary) => [
  { href: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
  { href: '/plan', label: t.nav.plan, icon: Route },
  { href: '/learn', label: t.nav.learn, icon: GraduationCap },
  { href: '/tasks', label: t.nav.tasks, icon: BookOpen },
  { href: '/mock', label: t.nav.mock, icon: ClipboardCheck },
  { href: '/sulu-ai', label: t.nav.sulu, icon: MessageCircle },
  { href: '/olympiads', label: t.nav.olympiads, icon: Flag },
  { href: '/class', label: t.nav.classes, icon: Users },
]

const teacherItems = (t: Dictionary) => [
  { href: '/class', label: t.nav.classes, icon: Users },
  { href: '/learn', label: t.nav.learn, icon: GraduationCap },
  { href: '/tasks', label: t.nav.tasks, icon: BookOpen },
  { href: '/olympiads', label: t.nav.olympiads, icon: Flag },
]

export function navItemsFor(role: Role, t: Dictionary) {
  return role === 'teacher' ? teacherItems(t) : studentItems(t)
}

export function RailLinks({ role }: { role: Role }) {
  const pathname = usePathname()
  const t = useT()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const items = navItemsFor(role, t)
  // A student's first five are the daily work; the rest are reference and the
  // coach. Two groups split by a rule read faster than one list of eight.
  const groups = role === 'teacher' ? [items] : [items.slice(0, 5), items.slice(5)]

  return (
    <>
      {groups.map((group, index) => (
        <div
          key={index}
          className={cn('flex flex-col gap-0.5', index > 0 && 'mt-3 border-t border-sidebar-border pt-3')}
        >
          {group.map((item) => (
            <RailLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={isActive(item.href)}
            >
              <item.icon aria-hidden className="size-[18px] shrink-0" strokeWidth={1.75} />
            </RailLink>
          ))}
        </div>
      ))}

      <div className="mt-3 flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
        <RailLink href="/settings" label={t.nav.settings} active={isActive('/settings')}>
          <Settings aria-hidden className="size-[18px] shrink-0" strokeWidth={1.75} />
        </RailLink>
      </div>
    </>
  )
}

/** Five rows: the shortest rail either role can have, so nothing jumps far. */
export function RailLinksSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-0.5">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex min-h-10 items-center gap-3 px-3">
          <div className="size-[18px] animate-pulse rounded-sm bg-sidebar-accent" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-sidebar-accent" />
        </div>
      ))}
    </div>
  )
}
