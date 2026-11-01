'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BrandMark } from '@/components/brand-mark'
import { useT } from '@/components/i18n-provider'
import { LocaleToggle } from '@/components/locale-toggle'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

/**
 * Sticky, because the page is four screens long and the way in should not be
 * one of them. The menu on a phone opens with the same disclosure gesture the
 * app uses, and closes on Escape or on picking something.
 */
export function MarketingHeader() {
  const t = useT()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label={t.landing.homeAria}>
          <BrandMark />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#subjects" className="transition-colors hover:text-foreground">
            {t.landing.navSubjects}
          </a>
          <a href="#sulu" className="transition-colors hover:text-foreground">
            Sulu AI
          </a>
          <a href="#how" className="transition-colors hover:text-foreground">
            {t.landing.navProgress}
          </a>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <LocaleToggle />
          <ThemeToggle />
          <Button variant="ghost" nativeButton={false} render={<Link href="/login">{t.auth.logIn}</Link>} />
          <Button
            nativeButton={false}
            render={<Link href="/signup">{t.landing.startTraining}</Link>}
          />
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="marketing-menu"
            aria-label={t.landing.toggleMenu}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>
      {open ? (
        <div
          id="marketing-menu"
          className="disclose border-t border-border bg-card px-5 py-4 md:hidden"
        >
          <nav className="flex flex-col gap-4 text-sm">
            <a href="#subjects" onClick={() => setOpen(false)}>
              {t.landing.navSubjects}
            </a>
            <a href="#sulu" onClick={() => setOpen(false)}>
              Sulu AI
            </a>
            <a href="#how" onClick={() => setOpen(false)}>
              {t.landing.navProgress}
            </a>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                nativeButton={false}
                render={<Link href="/login">{t.auth.logIn}</Link>}
              />
              <Button
                className="flex-1"
                nativeButton={false}
                render={<Link href="/signup">{t.landing.startTraining}</Link>}
              />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
