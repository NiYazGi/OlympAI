import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasTelegram, say, webhookSecret } from '@/lib/telegram'
import { handleTelegramReflection } from '@/lib/telegram-reflection'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Secret-authenticated webhook. Personal self-reports are accepted in private chats only. */
export async function POST(request: NextRequest) {
  const secret = webhookSecret()
  if (!secret || request.headers.get('x-telegram-bot-api-secret-token') !== secret) return new NextResponse('no', { status: 401 })
  if (!hasTelegram()) return new NextResponse('not configured', { status: 503 })
  const update = await request.json().catch(() => null)
  const message = update?.message
  const text = typeof message?.text === 'string' ? message.text.trim() : ''
  const chatId = message?.chat?.id
  if (!Number.isSafeInteger(chatId) || chatId <= 0 || !text || message?.chat?.type !== 'private') return NextResponse.json({ ok: true })
  try {
    await handle(chatId, text, typeof message?.from?.username === 'string' ? message.from.username : null,
      Number.isSafeInteger(update?.update_id) ? update.update_id : undefined)
  } catch (cause) {
    console.error('[telegram] update failed:', cause)
  }
  return NextResponse.json({ ok: true })
}

type Profile = { id: string; full_name: string | null }
async function handle(chatId: number, text: string, username: string | null, updateId?: number) {
  const admin = createAdminClient()
  if (/^\/start(?:@\w+)?(?:\s|$)/i.test(text)) {
    const { data: already } = await admin.from('profiles').select('id, full_name').eq('telegram_chat_id', chatId).not('telegram_linked_at', 'is', null).maybeSingle()
    if (already) {
      await say(chatId, `С возвращением, ${already.full_name ?? ''}. Самооценка добровольная: /reflection_on — включить, /reflection_off — выключить, /day — заполнить, /score — посмотреть свои пять отметок.`)
      return
    }
    const code = text.replace(/^\/start(?:@\w+)?/i, '').trim()
    const linked = code ? await linkByCode(chatId, code) : await linkByUsername(chatId, username)
    await say(chatId, linked
      ? `Аккаунт ${linked.full_name ?? ''} привязан. Самооценка доступна по желанию. /reflection_on — включить пять личных отметок от 0 до 5; /reflection_off — выключить. Критерии Темирлан агая ещё не утверждены.`
      : 'Не нашёл аккаунт по этой ссылке. Открой в OlympAI настройки, раздел Telegram, и перейди по одноразовой ссылке оттуда.')
    return
  }
  const { data: profile } = await admin.from('profiles').select('id, full_name').eq('telegram_chat_id', chatId).not('telegram_linked_at', 'is', null).maybeSingle()
  if (!profile) { await say(chatId, 'Сначала привяжи аккаунт через раздел Telegram в настройках OlympAI.'); return }
  await handleTelegramReflection(chatId, text, profile, updateId)
}

/** The one-time code from the deep link. Spent on use. */
async function linkByCode(chatId: number, code: string): Promise<Profile | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .update({
      telegram_chat_id: chatId,
      telegram_linked_at: new Date().toISOString(),
      telegram_link_code: null,
    })
    .eq('telegram_link_code', code)
    .select('id, full_name')
    .maybeSingle()
  return data ?? null
}

/** How linking worked before the code existed. Kept for accounts that used it. */
async function linkByUsername(chatId: number, username: string | null): Promise<Profile | null> {
  if (!username) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .update({ telegram_chat_id: chatId, telegram_linked_at: new Date().toISOString() })
    .eq('telegram_username', username.toLowerCase())
    .is('telegram_chat_id', null)
    .select('id, full_name')
    .maybeSingle()
  return data ?? null
}
