'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, BookOpen, Cpu, Layers, Flag, GraduationCap, LayoutGrid, Library, ScrollText, Settings, Trophy, Users } from 'lucide-react'
import { RollText } from '@/components/motion'
import { cn } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'

const items = [
  { href: '/admin', label: 'Overview', icon: LayoutGrid },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/tasks', label: 'Problems', icon: Library },
  { href: '/admin/opora', label: 'Opora', icon: Layers },
  { href: '/admin/ai', label: 'AI', icon: Cpu },
  { href: '/admin/attempts', label: 'Attempts', icon: Activity },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/olympiads', label: 'Olympiads', icon: Trophy },
  { href: '/admin/classes', label: 'Classes', icon: GraduationCap },
  { href: '/settings/material', label: 'Material', icon: BookOpen },
  { href: '/admin/log', label: 'Activity log', icon: ScrollText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminNav() {
  const t = useT()

  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav aria-label={t('Admin')} className="flex gap-1 overflow-x-auto rounded-xl bg-ink p-1 shadow-key">
      {items.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-200',
              active
                ? 'bg-foreground/[0.08] text-foreground shadow-[rgba(255,255,255,0.08)_0_1px_0_inset]'
                : 'text-ash hover:bg-foreground/[0.04] hover:text-foreground',
            )}
          >
            <item.icon className="size-4" />
            <RollText>{t(item.label)}</RollText>
          </Link>
        )
      })}
    </nav>
  )
}
