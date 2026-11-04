'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BrandGlyph, BrandMark } from '@/components/brand-mark'
import { delay } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'
import { LanguageSwitcher } from '@/components/language-switcher'

/**
 * Auth pages sit on the same atmosphere as the hero: a quiet blue wash and one
 * coral streak, with the form in a single key-cap card in the middle.
 */
export function AuthShell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow: string }) {
  const t = useT()

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-void">
      <div className="hero-atmosphere opacity-70" aria-hidden>
        <div className="hero-grid" />
        <span className="hero-bar hero-bar--blue" />
        <span className="hero-bar hero-bar--coral-2" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label={t('OlympAI home')}>
          <BrandMark />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-ash transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" /> {t('Back home')}
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="enter w-full max-w-[400px]">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="relative mb-6 flex size-14 items-center justify-center rounded-2xl bg-card shadow-key-strong">
              <span aria-hidden className="breathe absolute inset-0 rounded-2xl bg-coral/20 blur-xl" />
              <BrandGlyph className="relative size-7" />
            </span>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-3 text-2xl font-normal text-white" style={delay(80)}>
              {title}
            </h1>
          </div>
          <div className="rounded-[20px] bg-ink/80 p-6 shadow-window backdrop-blur-xl sm:p-8">{children}</div>
          <p className="mt-6 text-center font-mono text-[11px] text-smoke">
            {t('Train with intent')} <span className="mx-1.5 text-iron">|</span> {t('Compete with confidence')}
          </p>
        </div>
      </div>
    </main>
  )
}
