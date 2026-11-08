'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageCircle,
  BookOpen,
  ClipboardCheck,
  Settings,
  Trophy,
  User,
  GraduationCap,
  MoreHorizontal,
  Users,
} from 'lucide-react'
import { useState, ViewTransition } from 'react'
import { BrandMark } from '@/components/brand-mark'
import { cn } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'

const studentNav = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/learn', label: 'Learn', icon: GraduationCap, also: ['/plan', '/path', '/study-plan', '/method'] },
  { href: '/tasks', label: 'Problems', icon: BookOpen },
  { href: '/mock', label: 'Papers', icon: ClipboardCheck },
  { href: '/sulu-ai', label: 'Sulu', icon: MessageCircle },
]

// Plan opens from Learn; Class only for a student who is in one (see the rail).
const studentMore = [
  { href: '/class', label: 'Class', icon: Users, classOnly: true },
  { href: '/olympiads', label: 'Olympiads', icon: Trophy },
  { href: '/me', label: 'Me', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
]

/** A teacher's tab bar: their classes and the library, nothing of a student's own practice. */
const teacherNav = [
  { href: '/class', label: 'Classes', icon: Users },
  { href: '/learn', label: 'Learn', icon: GraduationCap },
  { href: '/tasks', label: 'Problems', icon: BookOpen },
  { href: '/olympiads', label: 'Olympiads', icon: Trophy },
]

const teacherMore = [{ href: '/settings', label: 'Settings', icon: Settings }]

export function MobileNav({ role = 'student', inClass = false }: { role?: 'student' | 'teacher'; inClass?: boolean }) {
  const navItems: { href: string; label: string; icon: typeof Users; also?: string[] }[] = role === 'teacher' ? teacherNav : studentNav
  const moreItems = (role === 'teacher' ? teacherMore : studentMore).filter(
    (item) => inClass || !('classOnly' in item && item.classOnly),
  )
  const t = useT()

  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      <header className="glass sticky top-0 z-20 flex items-center gap-2.5 border-b border-foreground/[0.06] px-4 py-3 md:hidden">
        <BrandMark />
        <ThemeToggle className="ml-auto" />
        <LanguageSwitcher />
      </header>

      <nav className="glass fixed inset-x-0 bottom-0 z-30 flex min-h-16 items-stretch justify-around border-t border-foreground/[0.06] px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
        {navItems.map((item) => {
          const active = isActive(item.href) || (item.also ?? []).some(isActive)
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={`nav:${item.href}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium transition-colors duration-200',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {/* The same travelling indicator as the desktop rail. */}
              {active ? (
                <ViewTransition name="tab-active" share="morph" default="none">
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-px rounded-full bg-coral shadow-[0_0_12px_rgba(255,99,99,0.8)]"
                  />
                </ViewTransition>
              ) : null}
              <item.icon className="size-5" />
              {t(item.label)}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium transition-colors',
            moreOpen || moreItems.some((item) => isActive(item.href))
              ? 'text-foreground'
              : 'text-smoke',
          )}
          aria-expanded={moreOpen}
          data-tour="nav:more"
          aria-label={t('More navigation options')}
        >
          <MoreHorizontal className="size-5" />
          {t('More')}
        </button>
      </nav>
      {moreOpen ? (
        <div className="glass page-in fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 rounded-2xl p-2 shadow-pop ring-1 ring-hairline md:hidden">
          {moreItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground hover:bg-foreground/[0.06]"
            >
              <item.icon className="size-5 text-ash" />
              {t(item.label)}
            </Link>
          ))}
        </div>
      ) : null}
    </>
  )
}
