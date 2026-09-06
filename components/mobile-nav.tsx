'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  ClipboardCheck,
  Route,
  Settings,
  Trophy,
  User,
  MoreHorizontal,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/path', label: 'Your path', icon: Route },
  { href: '/tasks', label: 'Tasks', icon: BookOpen },
  { href: '/sulu-ai', label: 'Sulu', icon: Sparkles },
  { href: '/mock', label: 'Mock tests', icon: ClipboardCheck },
]

const moreItems = [
  { href: '/olympiads', label: 'Olympiads', icon: Trophy },
  { href: '/me', label: 'Me', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center gap-2.5 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-3.5" />
        </div>
        <p className="text-sm font-semibold tracking-tight">OlympAI</p>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex min-h-16 items-stretch justify-around border-t border-border bg-background/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium transition-colors',
            moreOpen || moreItems.some((item) => isActive(item.href))
              ? 'text-primary'
              : 'text-muted-foreground',
          )}
          aria-expanded={moreOpen}
          aria-label="More navigation options"
        >
          <MoreHorizontal className="size-5" />
          More
        </button>
      </nav>
      {moreOpen ? (
        <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 rounded-2xl border border-border bg-background p-2 shadow-xl md:hidden">
          {moreItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-accent"
            >
              <item.icon className="size-5 text-primary" />
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </>
  )
}
