'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageCircle,
  BookOpen,
  ClipboardCheck,
  Settings,
  Flag,
  User,
  GraduationCap,
  MoreHorizontal,
  Route,
  Users,
} from 'lucide-react'
import { useEffect, useState, ViewTransition } from 'react'
import { useT } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'
import type { Role } from '@/components/rail-links'
import type { Dictionary } from '@/lib/i18n/dictionaries'

/*
 * Five tabs and a drawer, per role. The five are what that account opens every
 * day; everything else is one tap further in. A teacher's five are the class
 * and the library — there is no paper for them to sit and no streak of their
 * own to keep.
 */
const navItems = (t: Dictionary, role: Role) =>
  role === 'teacher'
    ? [
        { href: '/class', label: t.nav.classes, icon: Users },
        { href: '/learn', label: t.nav.learn, icon: GraduationCap },
        { href: '/tasks', label: t.nav.tasks, icon: BookOpen },
        { href: '/olympiads', label: t.nav.olympiads, icon: Flag },
      ]
    : [
        { href: '/dashboard', label: t.nav.home, icon: LayoutDashboard },
        { href: '/learn', label: t.nav.learn, icon: GraduationCap },
        { href: '/tasks', label: t.nav.tasks, icon: BookOpen },
        { href: '/mock', label: t.nav.papers, icon: ClipboardCheck },
        { href: '/sulu-ai', label: t.nav.sulu, icon: MessageCircle },
      ]

const moreItems = (t: Dictionary, role: Role) =>
  role === 'teacher'
    ? [
        { href: '/me', label: t.nav.meShort, icon: User },
        { href: '/settings', label: t.nav.settings, icon: Settings },
      ]
    : [
        { href: '/plan', label: t.nav.plan, icon: Route },
        { href: '/olympiads', label: t.nav.olympiads, icon: Flag },
        { href: '/class', label: t.nav.classes, icon: Users },
        { href: '/me', label: t.nav.meShort, icon: User },
        { href: '/settings', label: t.nav.settings, icon: Settings },
      ]

/**
 * The phone's tab bar.
 *
 * It used to render a second "OlympAI" header of its own, stacked under the
 * one the layout already shows at every width, so a phone opened on two
 * identical title bars.
 */
export function MobileNav({ role = 'student' }: { role?: Role }) {
  const pathname = usePathname()
  const t = useT()
  // The sheet belongs to the page it was opened on. Recording where rather
  // than whether means it closes itself on any navigation — tapping another
  // tab used to leave it hanging open over the new page.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const moreOpen = openOn === pathname
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  useEffect(() => {
    if (!moreOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenOn(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen])

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex min-h-16 items-stretch justify-around bg-sidebar px-1 pb-[env(safe-area-inset-bottom)] text-sidebar-foreground md:hidden"
      >
        {navItems(t, role).map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              data-tour={`nav:${item.href}`}
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 font-display text-xs transition-colors duration-200 active:bg-sidebar-accent',
                active ? 'font-bold text-sidebar-foreground' : 'font-semibold text-sidebar-muted',
              )}
            >
              {/* The same travelling indicator as the desktop rail. */}
              {active ? (
                <ViewTransition name="tab-active" share="morph" default="none">
                  <span
                    aria-hidden
                    className="absolute inset-x-2 top-0 h-[3px] bg-sidebar-primary"
                  />
                </ViewTransition>
              ) : null}
              <item.icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
        <button
          type="button"
          data-tour="nav:more"
          onClick={() => setOpenOn(moreOpen ? null : pathname)}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 font-display text-xs transition-colors active:bg-sidebar-accent',
            moreOpen || moreItems(t, role).some((item) => isActive(item.href))
              ? 'font-bold text-sidebar-foreground'
              : 'font-semibold text-sidebar-muted',
          )}
          aria-expanded={moreOpen}
          aria-controls="more-navigation"
          aria-label={t.nav.more}
        >
          <MoreHorizontal
            className={cn('size-5 transition-transform duration-200', moreOpen && 'rotate-90')}
          />
          {t.nav.more}
        </button>
      </nav>

      {moreOpen ? (
        <>
          {/* Tapping anywhere else puts it away, as a sheet should. */}
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpenOn(null)}
            className="animate-in fade-in fixed inset-0 z-20 bg-black/25 duration-200 md:hidden"
          />
          <div
            id="more-navigation"
            className="sheet-up fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 rounded-md border border-border bg-background p-2 shadow-[0_12px_32px_-12px_rgba(22,26,24,0.35)] md:hidden"
          >
            {moreItems(t, role).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-sm px-3 font-display text-base font-semibold hover:bg-accent',
                  isActive(item.href) && 'bg-accent',
                )}
              >
                <item.icon className="size-5 text-foreground" strokeWidth={1.75} />
                {item.label}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </>
  )
}
