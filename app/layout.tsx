import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Golos_Text, Literata } from 'next/font/google'
import { MotionRuntime, MotionScript } from '@/components/motion'
import { I18nProvider } from '@/components/i18n-provider'
import { MESSAGES } from '@/lib/i18n/messages'
import { getLocale } from '@/lib/i18n/server'
import { cookies } from 'next/headers'
import { DEFAULT_THEME, isTheme, THEME_COLOR, THEME_COOKIE, type Theme } from '@/lib/theme'
import './globals.css'

// Golos Text was drawn for Russian interfaces; it keeps Cyrillic and Kazakh
// letters even and readable at small sizes.
const golos = Golos_Text({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], variable: '--font-sans-ui', display: 'swap' })
// A book serif for large headings only, so the pages read like a textbook.
const literata = Literata({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-literata',
  display: 'swap',
  weight: ['500', '600'],
  preload: false,
})
// Mono only sets small labels, so it is not worth a preload that competes with
// the body font and the page's own requests on first paint.
const geistMono = Geist_Mono({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-geist-mono',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'OlympAI — AI Olympiad Coach', template: '%s | OlympAI' },
  description: 'Practice olympiad problems, understand mistakes, and build mastery with a guided AI coach.',
  applicationName: 'OlympAI',
  keywords: ['olympiad preparation', 'academic practice', 'physics', 'mathematics', 'AI coach'],
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }] },
  openGraph: { title: 'OlympAI — AI Olympiad Coach', description: 'Practice olympiad problems with guided AI coaching.', type: 'website', siteName: 'OlympAI', images: [{ url: '/icon.svg', width: 512, height: 512, alt: 'OlympAI' }] },
  twitter: { card: 'summary', title: 'OlympAI — AI Olympiad Coach', description: 'Practice olympiad problems with guided AI coaching.' },
  robots: { index: true, follow: true },
}

async function getTheme(): Promise<Theme> {
  const chosen = (await cookies()).get(THEME_COOKIE)?.value
  return isTheme(chosen) ? chosen : DEFAULT_THEME
}

export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme()
  return { colorScheme: theme, themeColor: THEME_COLOR[theme] }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()])

  return (
    <html
      lang={locale}
      className={`${golos.variable} ${literata.variable} ${geistMono.variable} bg-background${theme === 'dark' ? ' dark' : ''}`}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <head>
        <MotionScript />
      </head>
      <body className="font-sans antialiased">
        <I18nProvider locale={locale} messages={MESSAGES[locale]}>
          {children}
        </I18nProvider>
        <MotionRuntime />
        {/* Vercel Analytics posts to an endpoint that only exists on Vercel; self-hosted it is a failing request per page. */}
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  )
}
