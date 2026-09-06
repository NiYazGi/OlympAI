'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  Route,
  Settings,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/path', label: 'Your path', icon: Route },
  { href: '/tasks', label: 'Tasks', icon: BookOpen },
  { href: '/mock', label: 'Mock tests', icon: ClipboardCheck },
  { href: '/sulu-ai', label: 'Sulu AI', icon: Sparkles },
  { href: '/olympiads', label: 'Olympiads', icon: Trophy },
]

/**
 * A floating icon rail.
 *
 * Labels are gone, so every target carries a tooltip: an icon-only rail that
 * cannot be read is a puzzle, not a navigation. The account sits at the top as
 * an avatar, which doubles as the link to /me — the same place the labelled
 * entry used to point.
 */
export function AppSidebar({ identity }: { identity: ReactNode }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <div className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 items-center p-4 md:flex">
      {/* Sized to its contents and centred, so it reads as a capsule floating
          over the page rather than a column bolted to the edge. Lighter than
          the background, not darker, for the same reason. */}
      <nav
        aria-label="Main"
        className="flex w-[4.5rem] flex-col items-center gap-2 rounded-full border border-border/70 bg-muted py-5 shadow-xl shadow-black/25"
      >
        {identity}

        <div className="mt-5 flex flex-col items-center gap-2">
          {navItems.map((item) => (
            <RailLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={isActive(item.href)}
            >
              <item.icon className="size-5" />
            </RailLink>
          ))}
        </div>

        <div className="mt-5 flex flex-col items-center gap-2">
          <RailLink href="/settings" label="Settings" active={isActive('/settings')}>
            <Settings className="size-5" />
          </RailLink>
        </div>
      </nav>
    </div>
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
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            prefetch
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex size-11 items-center justify-center rounded-full transition-colors',
              active
                // A ring rather than a filled pill: the icon stays legible and
                // the rail keeps its quiet, monochrome look.
                ? 'text-foreground ring-2 ring-foreground/70'
                : 'text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
            )}
          >
            {children}
          </Link>
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
