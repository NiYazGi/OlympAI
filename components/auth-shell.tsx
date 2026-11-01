'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { useT } from '@/components/i18n-provider'

// A client component because the login form is one, and a client component
// cannot render an async server child.
export function AuthShell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow: string }) {
  const t = useT()

  return (
    <main className="flex min-h-dvh">
      <div className="hidden w-[42%] flex-col justify-between bg-primary p-10 text-white lg:flex">
        <BrandMark light />
        <div className="max-w-sm">
          <p className="mb-4 text-sm font-medium text-white/70">{eyebrow}</p>
          <h1 className="font-display text-3xl leading-[1.2] font-bold tracking-[-0.035em] sm:text-4xl">{t.auth.tagline}</h1>
          <p className="mt-5 text-sm leading-6 text-white/70">{t.auth.blurb}</p>
        </div>
        <p className="text-xs text-white/50">{t.auth.builtFor}</p>
      </div>
      <div className="flex flex-1 flex-col px-5 py-6 sm:px-10 lg:px-20">
        <Link href="/" className="mb-14 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:hidden"><ArrowLeft className="size-4" /> {t.auth.backHome}</Link>
        <div className="m-auto w-full max-w-md">
          <div className="mb-8 lg:hidden"><BrandMark /></div>
          <p className="text-caption font-semibold text-primary">{eyebrow}</p>
          <h2 className="font-display mt-2 text-2xl leading-[1.2] font-bold tracking-[-0.03em]">{title}</h2>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  )
}