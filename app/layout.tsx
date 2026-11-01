import { Suspense } from 'react'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Sofia_Sans, Sofia_Sans_Condensed, Sofia_Sans_Semi_Condensed } from 'next/font/google'
import { I18nProvider } from '@/components/i18n-provider'
import { NavigationProgress } from '@/components/navigation-progress'
import { ThemeScript } from '@/components/theme-script'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getLocale } from '@/lib/i18n'
import './globals.css'

/*
 * One family in three widths, the way a classroom wall chart is set.
 *
 * Sofia Sans carries every word; the semi-condensed cut sets headings and the
 * condensed cut sets the big figures, so a score of 5 out of 7 can be large
 * without pushing its verdict off the line. Cyrillic is native to the family
 * rather than added to a Latin design, which is what a Russian interface
 * reads first.
 *
 * There is no monospaced face any more. Figures use tabular numerals of the
 * same family, so a count still does not shift under its label.
 */
const sofia = Sofia_Sans({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sofia',
  display: 'swap',
})
const sofiaSemi = Sofia_Sans_Semi_Condensed({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sofia-semi',
  display: 'swap',
})
const sofiaCondensed = Sofia_Sans_Condensed({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sofia-condensed',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'OlympAI — AI Olympiad Coach', template: '%s | OlympAI' },
  description:
    'Practice olympiad problems, understand mistakes, and build mastery with a guided AI coach.',
  applicationName: 'OlympAI',
  keywords: ['olympiad preparation', 'academic practice', 'physics', 'mathematics', 'AI coach'],
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'OlympAI — AI Olympiad Coach',
    description: 'Practice olympiad problems with guided AI coaching.',
    type: 'website',
    siteName: 'OlympAI',
    images: [{ url: '/icon.svg', width: 512, height: 512, alt: 'OlympAI' }],
  },
  twitter: {
    card: 'summary',
    title: 'OlympAI — AI Olympiad Coach',
    description: 'Practice olympiad problems with guided AI coaching.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#121614' },
    { media: '(prefers-color-scheme: light)', color: '#1f3b33' },
  ],
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale()

  return (
    // Light by default: the work is read and written for forty minutes at a
    // stretch, under a desk lamp, and the olympiad itself is on paper. The
    // inline script swaps to dark for anyone who chose it.
    <html
      lang={locale}
      className={`${sofia.variable} ${sofiaSemi.variable} ${sofiaCondensed.variable} light bg-background`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="font-sans antialiased">
        {/* useSearchParams needs a boundary, or every static page would opt
            into client rendering to read a query string it never uses. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <I18nProvider locale={locale}>
          <TooltipProvider delay={200}>{children}</TooltipProvider>
        </I18nProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
