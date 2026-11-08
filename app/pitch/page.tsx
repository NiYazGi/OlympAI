import type { Metadata } from 'next'
import { PitchDeck } from '@/components/pitch/pitch-deck'
import { getDb } from '@/lib/db'

/**
 * The pitch deck. Like /npms, nothing on the site links here, it is not in the
 * sitemap, and search engines are told to leave it out.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'OlympAI · Pitch' },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
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

export default async function PitchPage() {
  const stats = await counts()
  const tasks = stats?.tasks ?? 2000
  // Rounded down to hundreds, written with a thin space: 2088 → "2 000".
  const rounded = (Math.floor(tasks / 100) * 100).toLocaleString('ru-RU').replace(/\s/g, ' ')
  return <PitchDeck tasks={rounded} olympiads={stats?.olympiads ?? 33} />
}
