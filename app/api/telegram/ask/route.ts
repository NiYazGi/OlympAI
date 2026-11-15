import { NextResponse, type NextRequest } from 'next/server'
import { hasTelegram } from '@/lib/telegram'
import { beginTelegramReflection, dueTelegramReflectionChats } from '@/lib/telegram-reflection'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/** Only linked students who explicitly opted in may receive this self-report prompt. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return new NextResponse('no', { status: 401 })
  if (!hasTelegram()) return new NextResponse('not configured', { status: 503 })
  const due = await dueTelegramReflectionChats()
  let asked = 0
  let failed = 0
  // Independent chats can be sent together. Each begin re-checks current consent
  // and an existing same-day reply/session before creating its own prompt.
  for (let offset = 0; offset < due.length; offset += 5) {
    const results = await Promise.allSettled(due.slice(offset, offset + 5).map((row) => beginTelegramReflection(row.chatId, row.userId, 'cron')))
    for (const result of results) {
      if (result.status === 'fulfilled') asked += result.value ? 1 : 0
      else failed++
    }
  }
  return NextResponse.json({ asked, failed })
}
