import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasSupabaseSecretKey } from '@/lib/supabase/secret-env'
import { QUESTIONS, hasTelegram, say, utcToday } from '@/lib/telegram'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * The evening ask, once a day, to everyone linked who has not reported.
 *
 * The laptop script does this by watching a clock in a loop. A deployment has
 * no loop, so Vercel calls this on a schedule (`vercel.json`) and the route
 * does the one pass. Timing is approximate on the Hobby plan, which is the
 * right precision for "some time in the evening".
 *
 * Guarded by CRON_SECRET: the path is guessable and the effect is a message to
 * every student.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('no', { status: 401 })
  }
  if (!hasTelegram() || !hasSupabaseSecretKey()) {
    return new NextResponse('not configured', { status: 503 })
  }

  const admin = createAdminClient()
  const date = utcToday()

  const { data: linked } = await admin
    .from('profiles')
    .select('id, telegram_chat_id')
    .not('telegram_chat_id', 'is', null)

  const { data: reported } = await admin
    .from('day_states')
    .select('user_id')
    .eq('on_date', date)
  const already = new Set((reported ?? []).map((row) => row.user_id))

  const due = (linked ?? []).filter((row) => row.telegram_chat_id && !already.has(row.id))

  for (const row of due) {
    const chatId = Number(row.telegram_chat_id)
    // Asking opens a session, exactly as /day does, so the first answer lands
    // on the first question rather than on nothing.
    await admin.from('telegram_sessions').upsert({
      chat_id: chatId,
      user_id: row.id,
      step: 0,
      answers: {},
      updated_at: new Date().toISOString(),
    })
    await say(chatId, `Как прошёл день?\n\n${QUESTIONS[0]!.text}`, QUESTIONS[0]!.keyboard)
  }

  return NextResponse.json({ asked: due.length })
}
