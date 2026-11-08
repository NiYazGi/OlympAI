import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Atom, Calculator, Medal, Trophy } from 'lucide-react'
import { BrandGlyph } from '@/components/brand-mark'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { getDb } from '@/lib/db'
import { getT } from '@/lib/i18n/server'

/**
 * A page that exists only for whoever has the link: nothing on the site leads
 * here, it is not in the sitemap, and search engines are told to leave it out.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return {
    title: t('With the support of RFMSh'),
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  }
}

async function counts() {
  try {
    const db = await getDb()
    const { rows } = await db.query<{ tasks: number; olympiads: number }>(`
      select (select count(*) from public.tasks where class_id is null and not hidden)::int as tasks,
             (select count(*) from public.competitions)::int as olympiads`)
    return rows[0] ?? null
  } catch {
    return null
  }
}

/** Rounded down to a friendly figure: 2088 reads as "2 000+". */
function roughly(n: number) {
  const step = n >= 1000 ? 1000 : n >= 100 ? 100 : 10
  return Math.max(step, Math.floor(n / step) * step).toLocaleString('ru-RU')
}

export default async function SupportPage() {
  const [t, stats] = await Promise.all([getT(), counts()])

  // One sentence with a slot for the name: Kazakh puts the name first.
  const [before = '', after = ''] = t('Made with the support of {org}', { org: '\u0000' }).split('\u0000')

  const facts = [
    { icon: Calculator, label: t('Mathematics') },
    { icon: Atom, label: t('Physics') },
    ...(stats
      ? [
          { icon: Trophy, label: t('{n}+ olympiad problems', { n: roughly(stats.tasks) }) },
          { icon: Medal, label: t('{n}+ olympiads in the catalogue', { n: roughly(stats.olympiads) }) },
        ]
      : []),
  ]

  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      {/* Soft light from the school's red and the site's blue, behind everything. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[#d7262e]/20 blur-[120px] dark:bg-[#d7262e]/25" />
        <div className="absolute -bottom-48 -left-24 h-[30rem] w-[30rem] rounded-full bg-[var(--hero-wash)] blur-[100px]" />
        <div className="absolute top-1/3 -right-32 h-[26rem] w-[26rem] rounded-full bg-[var(--hero-wash)] blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:28px_28px] opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <header className="flex items-center justify-end gap-1.5 px-5 py-5 sm:px-8">
        <ThemeToggle />
        <LanguageSwitcher />
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 pb-16 text-center sm:px-8">
        <div className="rise flex items-center gap-5 sm:gap-8">
          <div className="flex size-24 items-center justify-center rounded-[28px] bg-card shadow-key-strong sm:size-32">
            <BrandGlyph className="size-14 sm:size-20" />
          </div>
          <span aria-hidden className="text-2xl font-light text-muted-foreground sm:text-3xl">
            ×
          </span>
          <div className="relative size-24 sm:size-32">
            <div aria-hidden className="absolute inset-0 rounded-full bg-[#d7262e]/30 blur-2xl" />
            <Image
              src="/partners/rfmsh.png"
              alt={t('RFMSh logo')}
              width={712}
              height={712}
              priority
              className="relative size-full rounded-full shadow-key-strong"
            />
          </div>
        </div>

        <p className="rise mt-10 text-[15px] font-semibold tracking-wide text-muted-foreground" style={{ animationDelay: '80ms' }}>
          OlympAI
        </p>
        <h1
          className="rise mt-3 text-balance text-[34px] leading-[1.1] font-semibold tracking-tight sm:text-[52px]"
          style={{ animationDelay: '140ms' }}
        >
          {before}
          <span className="bg-gradient-to-r from-[#d7262e] to-[#ff6b5e] bg-clip-text text-transparent">{t('RFMSh')}</span>
          {after}
        </h1>
        <p className="rise mt-4 max-w-xl text-balance text-base leading-7 text-muted-foreground sm:text-lg" style={{ animationDelay: '200ms' }}>
          {t('Republican Physics and Mathematics School, Kazakhstan')}
        </p>

        <p className="rise mt-8 max-w-2xl text-pretty text-[15px] leading-7 text-foreground/80" style={{ animationDelay: '260ms' }}>
          {t('OlympAI prepares students for olympiads in mathematics and physics: archives of past rounds, a coach that reads your solution line by line, and hints that lead you to the answer instead of giving it away.')}
        </p>

        <ul className="rise mt-8 flex flex-wrap justify-center gap-2" style={{ animationDelay: '320ms' }}>
          {facts.map((fact) => (
            <li key={fact.label} className="inline-flex items-center gap-2 rounded-full bg-card/80 px-4 py-2 text-sm text-foreground shadow-key backdrop-blur">
              <fact.icon className="size-4 text-[#d7262e]" />
              {fact.label}
            </li>
          ))}
        </ul>

        <div className="rise mt-10 flex flex-col items-center gap-3 sm:flex-row" style={{ animationDelay: '380ms' }}>
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#d7262e] px-5 text-sm font-medium text-white shadow-button transition-colors hover:bg-[#bf1f27]"
          >
            {t('Open OlympAI')} <ArrowRight className="size-4" />
          </Link>
          <a
            href="https://fizmat.kz"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center rounded-xl px-5 text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
          >
            fizmat.kz
          </a>
        </div>
      </section>

      <footer className="pb-8 text-center text-xs text-muted-foreground">
        olympai.kz · {t('RFMSh, since 1972')}
      </footer>
    </main>
  )
}
