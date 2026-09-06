import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ThemeScript } from '@/components/theme-script'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'OlympAI — AI Olympiad Coach', template: '%s | OlympAI' },
  description: 'Practice olympiad problems, understand mistakes, and build mastery with a guided AI coach.',
  applicationName: 'OlympAI',
  keywords: ['olympiad preparation', 'academic practice', 'physics', 'mathematics', 'AI coach'],
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' }], apple: '/apple-icon.png' },
  openGraph: { title: 'OlympAI — AI Olympiad Coach', description: 'Practice olympiad problems with guided AI coaching.', type: 'website', siteName: 'OlympAI', images: [{ url: '/icon.svg', width: 512, height: 512, alt: 'OlympAI' }] },
  twitter: { card: 'summary', title: 'OlympAI — AI Olympiad Coach', description: 'Practice olympiad problems with guided AI coaching.' },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#12151c' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Dark by default; the inline script swaps to light for anyone who chose it.
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark bg-background`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="font-sans antialiased">
        <TooltipProvider delay={200}>{children}</TooltipProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
