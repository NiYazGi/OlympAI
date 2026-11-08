'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { useT } from '@/components/i18n-provider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'

/**
 * Login, sign-up and the other account pages: the name at the top, a heading,
 * and the form on a plain card. Nothing else competes with the form.
 */
export function AuthShell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow: string }) {
  const t = useT()

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label={t('OlympAI home')}>
          <BrandMark />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          <Link href="/" className="ml-2 hidden items-center gap-1.5 text-[14px] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex">
            <ArrowLeft className="size-4" /> {t('Back home')}
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
        <div className="enter w-full max-w-[420px]">
          <p className="text-[14px] font-medium text-muted-foreground">{eyebrow}</p>
          <h1 className="font-display mt-2 text-[30px] leading-tight font-semibold">{title}</h1>
          <div className="mt-6 rounded-xl border border-border bg-card p-6 sm:p-7">{children}</div>
        </div>
      </div>
    </main>
  )
}
