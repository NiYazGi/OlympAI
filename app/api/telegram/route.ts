import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasSupabaseSecretKey } from '@/lib/supabase/secret-env'
import { dictionary } from '@/lib/i18n/dictionaries'
import { phaseFor, scoreDay, type DayInputs } from '@/lib/day-state'
import {
  QUESTIONS,
  dayColumns,
  hasTelegram,
  pips,
  say,
  utcToday,
  webhookSecret,
  type Answers,
} from '@/lib/telegram'

export const dynamic = 'force-dynamic'

/**
 * Telegram calls this when somebody writes to the bot.
 *
 * The same five questions the laptop script asks, reached the other way round:
 * Telegram does the calling, so there is no process to keep alive and the bot
 * lives wherever the app is deployed.
 *
 * Three things are different from the script, and each is forced by the shape
 * of a webhook:
 *
 *  - **No memory.** Which question is outstanding lives in telegram_sessions
 *    rather than in a Map, because this is a different process every time.
 *  - **Linking by code.** The script matches the Telegram username typed at
 *    sign-up. Here the app hands out a deep link carrying a one-time code, and
 *    the chat that arrives holding it is the chat that opened it. The old
 *    username match stays as a fallback.
 *  - **One scorer.** The script had to re-implement the scoring because a
 *    plain .mjs cannot import the TypeScript that reaches for the dictionary.
 *    Here `scoreDay` is imported, so the bot and the dashboard cannot drift.
 *
 * Every write uses the service role. That is the honest client for this job:
 * the caller is Telegram, the subject is identified by a chat id, and there is
 * no session anywhere in the request to carry RLS.
 */
export async function POST(request: NextRequest) {
  // Telegram echoes this header on every call. Without it the URL alone would
  // be the authentication, and a URL travels — through Telegram's own logs,
  // through whatever terminal set it.
  const secret = webhookSecret()
  if (!secret || request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new NextResponse('no', { status: 401 })
  }
  if (!hasTelegram() || !hasSupabaseSecretKey()) {
    return new NextResponse('not configured', { status: 503 })
  }

  const update = await request.json().catch(() => null)
  const message = update?.message
  const text: string = typeof message?.text === 'string' ? message.text.trim() : ''
  const chatId: number | undefined = message?.chat?.id

  // Telegram retries anything that is not a 200, so an update this bot has no
  // use for is acknowledged rather than refused.
  if (!chatId || !text) return NextResponse.json({ ok: true })

  try {
    await handle(chatId, text, message?.from?.username ?? null)
  } catch (cause) {
    console.error('[telegram] update failed:', cause)
  }
  return NextResponse.json({ ok: true })
}

type Profile = { id: string; full_name: string | null }

async function handle(chatId: number, text: string, username: string | null) {
  const admin = createAdminClient()

  if (text.startsWith('/start')) {
    const { data: already } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('telegram_chat_id', chatId)
      .maybeSingle()
    if (already) {
      await say(chatId, `С возвращением, ${already.full_name ?? ''}. /day — отметить день, /score — счёт.`)
      return
    }

    const code = text.slice('/start'.length).trim()
    const linked = code
      ? await linkByCode(chatId, code)
      : await linkByUsername(chatId, username)

    await say(
      chatId,
      linked
        ? `Привязано к аккаунту ${linked.full_name ?? ''}.\n\nКаждый вечер я задам пять вопросов и заполню ваш день. /day — спросить сейчас.`
        : 'Не нашёл аккаунт по этой ссылке. Откройте в OlympAI настройки, раздел Telegram, и перейдите по ссылке оттуда — она одноразовая и могла устареть.',
    )
    return
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()
  if (!profile) {
    await say(chatId, 'Сначала привяжите аккаунт: откройте в OlympAI настройки, раздел Telegram.')
    return
  }

  if (text === '/day') {
    await admin
      .from('telegram_sessions')
      .upsert({ chat_id: chatId, user_id: profile.id, step: 0, answers: {}, updated_at: new Date().toISOString() })
    await say(chatId, QUESTIONS[0]!.text, QUESTIONS[0]!.keyboard)
    return
  }

  if (text === '/score') {
    await report(chatId, profile)
    return
  }

  if (await answered(chatId, text, profile)) return
  await say(chatId, '/day — отметить день, /score — сегодняшний счёт.')
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
    .select('id, full_name')
    .maybeSingle()
  return data ?? null
}

/** One answer to the outstanding question. Returns false if none was asked. */
async function answered(chatId: number, text: string, profile: Profile): Promise<boolean> {
  const admin = createAdminClient()
  const { data: session } = await admin
    .from('telegram_sessions')
    .select('step, answers')
    .eq('chat_id', chatId)
    .maybeSingle()
  if (!session) return false

  const question = QUESTIONS[session.step]
  if (!question) {
    await admin.from('telegram_sessions').delete().eq('chat_id', chatId)
    return false
  }

  const answers: Answers = { ...(session.answers as Answers), [question.key]: question.parse(text) }
  const step = session.step + 1

  if (step < QUESTIONS.length) {
    await admin
      .from('telegram_sessions')
      .update({ step, answers, updated_at: new Date().toISOString() })
      .eq('chat_id', chatId)
    await say(chatId, QUESTIONS[step]!.text, QUESTIONS[step]!.keyboard)
    return true
  }

  await admin.from('telegram_sessions').delete().eq('chat_id', chatId)
  await admin.from('day_states').upsert(
    {
      user_id: profile.id,
      on_date: utcToday(),
      ...dayColumns(answers),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,on_date' },
  )
  await report(chatId, profile)
  return true
}

/**
 * Today's score, scored by the same function the dashboard draws.
 *
 * The solving axis takes the larger of what was reported and what the app can
 * see from graded work, so the number here is read out of the day as stored
 * rather than out of the answers just given.
 */
async function report(chatId: number, profile: Profile) {
  const admin = createAdminClient()
  const date = utcToday()

  const { data: day } = await admin
    .from('day_states')
    .select('theory_minutes, solving_minutes, mental, sleep_hours, lights_out, load_minutes')
    .eq('user_id', profile.id)
    .eq('on_date', date)
    .maybeSingle()

  if (!day) {
    await say(chatId, 'Сегодня ещё ничего не отмечено. /day — отметить.')
    return
  }

  const { data: target } = await admin
    .from('profiles')
    .select('target_date')
    .eq('id', profile.id)
    .maybeSingle()
  const daysLeft = target?.target_date
    ? Math.max(
        0,
        Math.round(
          (new Date(`${target.target_date}T00:00:00Z`).getTime() - new Date(`${date}T00:00:00Z`).getTime()) /
            86_400_000,
        ),
      )
    : null

  const inputs: DayInputs = {
    theoryMinutes: day.theory_minutes,
    solvingMinutes: day.solving_minutes,
    mental: day.mental,
    sleepHours: Number(day.sleep_hours),
    lightsOut: day.lights_out,
    loadMinutes: day.load_minutes,
    reported: true,
  }

  // Russian, like every message this bot sends. The XP the app can see is not
  // read here: that would be a second query per message to move one axis by at
  // most a point, and the dashboard is where the full picture lives.
  const t = dictionary('ru')
  const score = scoreDay(inputs, phaseFor(daysLeft), { today: 0, goal: 50 }, t)
  const lines = score.axes.map((axis) => `${axis.label}: ${pips(axis.score)}`)
  const verdict = score.met
    ? 'Выше планки. День засчитан.'
    : `Не хватает ${score.short} до планки.${score.cheapest ? ` Дешевле всего добрать здесь: ${score.cheapest.label}.` : ''}`

  await say(chatId, `${score.total} / 25\n\n${lines.join('\n')}\n\n${verdict}`)
}
