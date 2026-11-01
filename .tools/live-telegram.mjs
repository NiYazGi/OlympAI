/**
 * The Telegram webhook, driven the way Telegram drives it.
 *
 * Posts real update payloads at a running server and checks what lands in the
 * database: the link, the five answers one message at a time, and the day the
 * answers add up to. No bot token is needed — sending the replies fails, which
 * is logged and does not change what is written.
 *
 *   node --import ./.tools/register.mjs .tools/live-telegram.mjs [--keep]
 *
 * The server must be running with TELEGRAM_BOT_TOKEN and
 * TELEGRAM_WEBHOOK_SECRET set; see the launch config olympai-telegram.
 */
import { readFile } from 'node:fs/promises'

const ROOT = '/Users/niya/Desktop/olympAI'
const KEEP = process.argv.includes('--keep')
const BASE = process.env.OLYMPAI_URL ?? 'http://localhost:3002'
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? 'test-webhook-secret'

const raw = await readFile(`${ROOT}/.env.local`, 'utf8')
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
}

const { createAdminClient } = await import('@/lib/supabase/admin')
const admin = createAdminClient()

let failures = 0
const ok = (label, condition, detail = '') => {
  console.log(`${condition ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}
const section = (title) => console.log(`\n${title}\n${'-'.repeat(title.length)}`)

const CHAT = 999000000 + Math.floor(Math.random() * 999999)
let updateId = 1

async function send(text, { secret = SECRET } = {}) {
  const response = await fetch(`${BASE}/api/telegram`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret },
    body: JSON.stringify({
      update_id: updateId++,
      message: {
        message_id: updateId,
        date: Math.floor(Date.now() / 1000),
        chat: { id: CHAT, type: 'private' },
        from: { id: CHAT, is_bot: false, first_name: 'Test' },
        text,
      },
    }),
  })
  return response.status
}

const today = new Date().toISOString().slice(0, 10)
const email = `tg.check+${Date.now()}@olympai.test`
let userId = null

try {
  section('a linked account')
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: `tg-${Math.random().toString(36).slice(2)}`,
    email_confirm: true,
    user_metadata: { full_name: 'Telegram Check' },
  })
  if (error) throw new Error(error.message)
  userId = created.user.id

  const code = `chk-${Math.random().toString(36).slice(2, 10)}`
  await admin.from('profiles').update({ telegram_link_code: code }).eq('id', userId)

  ok('a call without the secret is refused', (await send('/start', { secret: 'wrong' })) === 401)

  const status = await send(`/start ${code}`)
  ok('the deep link is accepted', status === 200, `status ${status}`)

  const { data: linked } = await admin
    .from('profiles')
    .select('telegram_chat_id, telegram_link_code')
    .eq('id', userId)
    .maybeSingle()
  ok('the chat is linked to the account', Number(linked?.telegram_chat_id) === CHAT)
  ok('the code is spent', linked?.telegram_link_code === null)

  section('five questions, one message at a time')
  await send('/day')
  const { data: started } = await admin
    .from('telegram_sessions')
    .select('step')
    .eq('chat_id', CHAT)
    .maybeSingle()
  ok('a session opens at the first question', started?.step === 0)

  // sleep, lights out, theory, solving, load, head
  for (const answer of ['7', 'Да', '1.5', '2', '6', '4']) await send(answer)

  const { data: finished } = await admin
    .from('telegram_sessions')
    .select('chat_id')
    .eq('chat_id', CHAT)
    .maybeSingle()
  ok('the session closes when the last one is answered', !finished)

  const { data: day } = await admin
    .from('day_states')
    .select('theory_minutes, solving_minutes, mental, sleep_hours, lights_out, load_minutes')
    .eq('user_id', userId)
    .eq('on_date', today)
    .maybeSingle()
  ok('the day is written', Boolean(day))
  ok('hours become minutes', day?.theory_minutes === 90 && day?.solving_minutes === 120, `${day?.theory_minutes}/${day?.solving_minutes}`)
  ok('sleep and lights out are kept', Number(day?.sleep_hours) === 7 && day?.lights_out === true)
  ok('load is in minutes, head is 1-5', day?.load_minutes === 360 && day?.mental === 4)

  section('answering out of turn')
  const before = await send('8')
  ok('a stray number is not an answer to anything', before === 200)
  const { data: unchanged } = await admin
    .from('day_states')
    .select('sleep_hours')
    .eq('user_id', userId)
    .eq('on_date', today)
    .maybeSingle()
  ok('and does not overwrite the day', Number(unchanged?.sleep_hours) === 7)
} catch (cause) {
  console.error('\n', cause)
  failures += 1
} finally {
  if (!KEEP && userId) {
    await admin.from('telegram_sessions').delete().eq('chat_id', CHAT)
    await admin.auth.admin.deleteUser(userId)
    console.log('\ncleaned up the test account')
  }
}

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
