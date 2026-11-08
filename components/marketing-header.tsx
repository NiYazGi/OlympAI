'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { BrandMark } from '@/components/brand-mark'
import { useT } from '@/components/i18n-provider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'

const links = [
  { href: '#how', label: 'How it works' },
  { href: '#subjects', label: 'Subjects' },
  { href: '#faq', label: 'Questions' },
]

/** A plain bar: the name, three anchors, and the two ways in. */
export function MarketingHeader() {
  const t = useT()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" aria-label={t('OlympAI home')} className="shrink-0">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-1 text-[15px] md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground">
              {t(link.label)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-1.5 md:flex">
          <ThemeToggle />
          <LanguageSwitcher />
          <Button variant="ghost" nativeButton={false} render={<Link href="/login">{t('Log in')}</Link>} />
          <Button nativeButton={false} render={<Link href="/signup">{t('Sign up')}</Link>} />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? t('Close menu') : t('Open menu')}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border px-5 pb-5 md:hidden">
          <nav className="flex flex-col py-2 text-[16px]">
            {links.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="py-3 text-foreground">
                {t(link.label)}
              </a>
            ))}
          </nav>
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" size="lg" nativeButton={false} render={<Link href="/login">{t('Log in')}</Link>} />
            <Button className="flex-1" size="lg" nativeButton={false} render={<Link href="/signup">{t('Sign up')}</Link>} />
          </div>
        </div>
      ) : null}
    </header>
  )
}
