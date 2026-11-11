import { getDb } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * For uptime monitoring: is the server up and does the database answer.
 * Says nothing else, so it is safe to leave open.
 */
export async function GET() {
  const started = Date.now()
  try {
    const db = await getDb()
    await db.query('select 1')
    return Response.json({ ok: true, db: 'ok', ms: Date.now() - started }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ ok: false, db: 'down' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
