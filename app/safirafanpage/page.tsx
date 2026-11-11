import type { Metadata } from 'next'
import { Caveat, Marck_Script } from 'next/font/google'
import { Journal } from '@/components/safira/journal'

/** Reachable only by whoever has the link: no navigation points here. */
export const metadata: Metadata = {
  title: { absolute: 'Дневник. Том 3' },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

const hand = Marck_Script({ subsets: ['cyrillic', 'latin'], weight: '400', variable: '--font-sf-hand', display: 'swap' })
const scribble = Caveat({ subsets: ['cyrillic', 'latin'], weight: ['500', '700'], variable: '--font-sf-scribble', display: 'swap' })

export default function SafiraFanPage() {
  return (
    <div className={`${hand.variable} ${scribble.variable}`}>
      <Journal />
    </div>
  )
}
