import type { Metadata } from 'next'
import { Deck } from '@/components/pitch2/deck'
import { getDb } from '@/lib/db'

/** Like /pitch and /npms: reachable only by whoever has the link. */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'OlympAI' },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

async function taskCount() {
  try {
    const db = await getDb()
    const { rows } = await db.query<{ tasks: number }>(
      `select count(*)::int as tasks from public.tasks where class_id is null and not hidden`,
    )
    return rows[0]?.tasks ?? null
  } catch {
    return null
  }
}

export default async function Pitch2Page() {
  const tasks = (await taskCount()) ?? 2000
  const rounded = (Math.floor(tasks / 100) * 100).toLocaleString('ru-RU').replace(/\s/g, ' ')
  return <Deck tasks={rounded} />
}
