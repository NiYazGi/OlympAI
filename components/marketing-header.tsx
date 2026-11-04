'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { BrandMark } from '@/components/brand-mark'
import { useT } from '@/components/i18n-provider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { RollText, useScrolled } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// In page order, so the indicator moves the same way the page does.
const links = [
  { id: 'subjects', label: 'Subjects' },
  { id: 'ladder', label: 'How it works' },
  { id: 'sulu', label: 'Sulu AI' },
  { id: 'grading', label: 'Grading' },
]

const SECTION_IDS = links.map((link) => link.id)

/** The section whose top has most recently passed under the header. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const update = () => {
      const line = window.innerHeight * 0.35
      let current: string | null = null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) current = id
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      setActive(atBottom ? ids[ids.length - 1] : current)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [ids])
  return active
}

/**
 * A floating glass pill. Transparent over the hero, it picks up its border,
 * blur and fill once the page starts moving underneath it.
 *
 * One highlight slides between the tabs: it follows the pointer while it is
 * over the nav and otherwise rests on the section in view, so clicking a tab
 * shows the highlight travel there as the page scrolls.
 */
export function MarketingHeader() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const scrolled = useScrolled()
  const active = useActiveSection(SECTION_IDS)
  const [hovered, setHovered] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)

  const target = hovered ?? active

  useLayoutEffect(() => {
    const nav = navRef.current
    const el = target ? nav?.querySelector<HTMLElement>(`[data-tab="${target}"]`) : null
    setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null)
  }, [target, t])

  function go(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id)
    if (!el) return
    event.preventDefault()
    setOpen(false)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: reduce ? 'auto' : 'smooth' })
    history.replaceState(null, '', `#${id}`)
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:pt-5">
      <div
        data-scrolled={scrolled || open}
        className="nav-pill enter mx-auto flex h-12 max-w-[1080px] items-center justify-between rounded-xl px-3 pl-4"
      >
        <Link href="/" aria-label={t('OlympAI home')} className="shrink-0">
          <BrandMark />
        </Link>
        <nav
          ref={navRef}
          onMouseLeave={() => setHovered(null)}
          className="relative hidden items-center text-[13px] font-medium text-ash md:flex"
        >
          <span
            aria-hidden
            className={cn('tab-pill', pill ? 'opacity-100' : 'opacity-0')}
            style={pill ? { transform: `translateX(${pill.left}px)`, width: pill.width } : undefined}
          />
          {links.map((link) => (
            <a
              key={link.id}
              data-tab={link.id}
              href={`#${link.id}`}
              onClick={(event) => go(event, link.id)}
              onMouseEnter={() => setHovered(link.id)}
              aria-current={active === link.id ? 'true' : undefined}
              className={cn(
                'relative rounded-lg px-3.5 py-1.5 transition-colors duration-300 hover:text-foreground',
                active === link.id && 'text-foreground',
              )}
            >
              <RollText key={t(link.label)}>{t(link.label)}</RollText>
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-1.5 md:flex">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            nativeButton={false}
            render={
              <Link href="/login">
                <RollText>{t('Log in')}</RollText>
              </Link>
            }
          />
          <Button
            nativeButton={false}
            render={
              <Link href="/signup">
                <RollText>{t('Start training')}</RollText>
              </Link>
            }
          />
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!open)}
            aria-label={t('Toggle menu')}
            aria-expanded={open}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>
      <div
        className={cn(
          'glass mx-auto mt-2 max-w-[1080px] overflow-hidden rounded-xl border border-hairline transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden',
          open ? 'max-h-80 opacity-100' : 'pointer-events-none max-h-0 border-transparent opacity-0',
        )}
      >
        <nav className="flex flex-col gap-1 p-2 text-sm">
          {links.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(event) => go(event, link.id)}
              className={cn(
                'rounded-lg px-3 py-2.5 text-ash hover:bg-foreground/[0.06] hover:text-foreground',
                active === link.id && 'bg-foreground/[0.04] text-foreground',
              )}
            >
              {t(link.label)}
            </a>
          ))}
          <div className="flex gap-2 p-1 pt-2">
            <Button variant="outline" className="flex-1" nativeButton={false} render={<Link href="/login">{t('Log in')}</Link>} />
            <Button className="flex-1" nativeButton={false} render={<Link href="/signup">{t('Start training')}</Link>} />
          </div>
        </nav>
      </div>
    </header>
  )
}
