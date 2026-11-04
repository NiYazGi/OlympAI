import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import { MotionRuntime, MotionScript } from '@/components/motion'
import { I18nProvider } from '@/components/i18n-provider'
import { MESSAGES } from '@/lib/i18n/messages'
import { getLocale } from '@/lib/i18n/server'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], variable: '--font-inter', display: 'swap' })
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

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#040506',
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale()

  return (
    // Dark only: the design has no light theme.
    <html
      lang={locale}
      className={`${inter.variable} ${geistMono.variable} dark bg-background`}
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
