/**
 * The bot that asks a student how their day went.
 *
 * Long polling, for a laptop. The deployed app answers a webhook instead —
 * `app/api/telegram/route.ts`, which needs no process of its own — and
 * **Telegram allows one or the other**: setting a webhook makes getUpdates
 * return nothing, and this script will sit here receiving silence. Delete the
 * webhook first (`…/deleteWebhook`). See docs/telegram.md.
 *
 * Still the right thing while developing: no public address, no tunnel, works
 * behind any router. Start it beside the dev server:
 *
 *   node scripts/telegram-bot.mjs
 *
 * It needs TELEGRAM_BOT_TOKEN in .env.local, next to the four secrets already
 * there. The token is not a setting; it is the whole of the bot's identity,
 * and anyone holding it can post as the bot. It belongs in the gitignored file
 * and nowhere else — not in a commit, not in a message.
 *
 * What it does:
 *   /start    links this chat to the profile whose telegram_username matches
 *   /day      asks the five questions now
 *   /score    repeats today's score without asking anything
 *   daily     asks by itself, once, at ASK_AT_HOUR in the student's evening
 *
 * It writes only to day_states, which is self-reported, pays no XP and unlocks
 * nothing. Nothing a student could gain by lying to it is worth having, which
 * is why a Telegram username is enough to link a chat and would not be enough
 * for anything else.
 */
import { readFile } from 'node:fs/promises'
import pg from 'pg'

const ROOT = new URL('..', import.meta.url).pathname

/** Local hour at which the bot asks, if nobody has been asked yet today. */
const ASK_AT_HOUR = Number(process.env.OLYMPAI_ASK_HOUR ?? 21)
/** How often to look at the clock. A minute is precise enough for a daily ask. */
const TICK_MS = 60_000

// ---------------------------------------------------------------- questions ---

/**
 * The five axes, in the order they are asked.
 *
 * Sleep first, because it is about last night and the student can answer it
 * without thinking about today. The head last, because by then they have
 * spent a minute recalling the day and the answer is better for it.
 */
const QUESTIONS = [
  {
    key: 'sleep_hours',
    text: 'Сколько часов вы спали прошлой ночью?',
    keyboard: [['4', '5', '6'], ['7', '8', '9']],
    parse: (value) => clamp(number(value), 0, 16),
  },
  {
    key: 'lights_out',
    text: 'Легли до 22:30?',
    keyboard: [['Да', 'Нет']],
    parse: (value) => /^(да|yes|y|\+)$/i.test(value.trim()),
  },
  {
    key: 'theory_hours',
    text: 'Сколько часов сегодня ушло на теорию — чтение, конспекты, разборы?',
    keyboard: [['0', '0.5', '1'], ['2', '3', '4']],
    parse: (value) => clamp(number(value), 0, 18),
  },
  {
    key: 'solving_hours',
    text: 'Сколько часов на задачи?',
    keyboard: [['0', '0.5', '1'], ['2', '3', '5']],
    parse: (value) => clamp(number(value), 0, 18),
  },
  {
    key: 'load_hours',
    text: 'Сколько часов забрали школа и остальные дела?',
    keyboard: [['0', '2', '4'], ['6', '8', '10']],
    parse: (value) => clamp(number(value), 0, 18),
  },
  {
    key: 'mental',
    text: 'Как голова? 1 — разбит, 5 — в ударе.',
    keyboard: [['1', '2', '3', '4', '5']],
    parse: (value) => clamp(Math.round(number(value)), 0, 5),
  },
]

const number = (value) => {
  const parsed = Number(String(value).replace(',', '.').replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}
const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

// -------------------------------------------------------------------- state ---

/** Where each chat is in the conversation. Lost on restart, which is fine: a
 *  half-finished check-in is re-asked rather than resumed wrongly. */
const asking = new Map()

// ------------------------------------------------------------------ plumbing ---

async function loadEnv() {
  const raw = await readFile(`${ROOT}.env.local`, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq !== -1 && !process.env[trimmed.slice(0, eq)]) {
      process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
    }
  }
}

let token
const api = async (method, body) => {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json()
  if (!payload.ok && method !== 'getUpdates') {
    console.error(`${method}: ${payload.description}`)
  }
  return payload.result
}

const say = (chat, text, keyboard) =>
  api('sendMessage', {
    chat_id: chat,
    text,
    reply_markup: keyboard
      ? { keyboard: keyboard.map((row) => row.map((t) => ({ text: t }))), resize_keyboard: true, one_time_keyboard: true }
      : { remove_keyboard: true },
  })

const utcToday = () => new Date().toISOString().slice(0, 10)

// ----------------------------------------------------------------- database ---

let db

async function profileFor(chatId) {
  const { rows } = await db.query(
    `select id, full_name, telegram_username from public.profiles where telegram_chat_id = $1`,
    [chatId],
  )
  return rows[0] ?? null
}

async function link(chatId, username) {
  if (!username) return null
  const { rows } = await db.query(
    `update public.profiles
        set telegram_chat_id = $1, telegram_linked_at = now()
      where lower(telegram_username) = lower($2)
      returning id, full_name`,
    [chatId, username],
  )
  return rows[0] ?? null
}

async function saveDay(userId, answers) {
  const minutes = (hours) => Math.round((hours ?? 0) * 60)
  await db.query(
    `insert into public.day_states
       (user_id, on_date, theory_minutes, solving_minutes, mental, sleep_hours, lights_out, load_minutes, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())
     on conflict (user_id, on_date) do update set
       theory_minutes = excluded.theory_minutes,
       solving_minutes = excluded.solving_minutes,
       mental = excluded.mental,
       sleep_hours = excluded.sleep_hours,
       lights_out = excluded.lights_out,
       load_minutes = excluded.load_minutes,
       updated_at = now()`,
    [
      userId,
      utcToday(),
      minutes(answers.theory_hours),
      minutes(answers.solving_hours),
      answers.mental ?? 0,
      answers.sleep_hours ?? 0,
      answers.lights_out ?? false,
      minutes(answers.load_hours),
    ],
  )
}

/**
 * Today's score, computed here rather than imported.
 *
 * lib/day-state.ts is TypeScript and reaches for the interface dictionary; a
 * plain script cannot load it without a build step. The bands are the ones in
 * that file and the two have to be changed together — which is stated here
 * because a scoring rule that silently disagrees with the dashboard is worse
 * than no bot at all.
 */
function score(answers) {
  const band = (value, thresholds) => thresholds.filter((t) => value >= t).length
  const reverse = (value, ceilings) => ceilings.filter((c) => value <= c).length
  const m = (hours) => Math.round((hours ?? 0) * 60)

  const axes = [
    ['Теория', band(m(answers.theory_hours), [10, 20, 30, 45, 60])],
    ['Решение', band(m(answers.solving_hours), [20, 40, 60, 90, 120])],
    ['Менталка', clamp(answers.mental ?? 0, 0, 5)],
    ['Сон', band(answers.sleep_hours ?? 0, [5, 6, 7, 7.5, 8])],
    ['Загруженность', reverse(m(answers.load_hours), [480, 390, 300, 210, 120])],
  ]
  const total = axes.reduce((sum, [, value]) => sum + value, 0)
  return { axes, total }
}

// ---------------------------------------------------------------- the asking ---

async function beginAsking(chatId, profile) {
  asking.set(chatId, { userId: profile.id, step: 0, answers: {} })
  const first = QUESTIONS[0]
  await say(chatId, first.text, first.keyboard)
}

async function handleAnswer(chatId, text) {
  const state = asking.get(chatId)
  if (!state) return false

  const question = QUESTIONS[state.step]
  state.answers[question.key] = question.parse(text)
  state.step += 1

  if (state.step < QUESTIONS.length) {
    const next = QUESTIONS[state.step]
    await say(chatId, next.text, next.keyboard)
    return true
  }

  asking.delete(chatId)
  await saveDay(state.userId, state.answers)
  const { axes, total } = score(state.answers)
  const lines = axes.map(([label, value]) => `${label}: ${'●'.repeat(value)}${'○'.repeat(5 - value)}`)
  const verdict =
    total > 15
      ? 'Выше планки. День засчитан.'
      : `Не хватает ${16 - total} до 16. Завтра дешевле всего добрать сном.`
  await say(chatId, `${total} / 25\n\n${lines.join('\n')}\n\n${verdict}`)
  return true
}

async function handleUpdate(update) {
  const message = update.message
  if (!message?.text) return
  const chatId = message.chat.id
  const text = message.text.trim()

  if (text.startsWith('/start')) {
    const existing = await profileFor(chatId)
    if (existing) {
      await say(chatId, `С возвращением, ${existing.full_name ?? ''}. /day — отметить день, /score — счёт.`)
      return
    }
    const linked = await link(chatId, message.from?.username)
    if (linked) {
      await say(
        chatId,
        `Привязано к аккаунту ${linked.full_name ?? ''}.\n\nКаждый вечер я задам пять вопросов и заполню ваш день. /day — спросить сейчас.`,
      )
    } else {
      await say(
        chatId,
        message.from?.username
          ? `Не нашёл аккаунт с юзернеймом @${message.from.username}. Впишите его в OlympAI при регистрации или в настройках — и напишите мне /start ещё раз.`
          : 'У вашего Telegram нет юзернейма — без него я не могу найти аккаунт. Задайте его в настройках Telegram и напишите /start ещё раз.',
      )
    }
    return
  }

  const profile = await profileFor(chatId)
  if (!profile) {
    await say(chatId, 'Сначала /start, чтобы привязать аккаунт.')
    return
  }

  if (text === '/day') {
    await beginAsking(chatId, profile)
    return
  }

  if (text === '/score') {
    const { rows } = await db.query(
      `select theory_minutes, solving_minutes, mental, sleep_hours, lights_out, load_minutes
         from public.day_states where user_id = $1 and on_date = $2`,
      [profile.id, utcToday()],
    )
    if (!rows[0]) {
      await say(chatId, 'Сегодня ещё ничего не отмечено. /day — отметить.')
      return
    }
    const row = rows[0]
    const { axes, total } = score({
      theory_hours: row.theory_minutes / 60,
      solving_hours: row.solving_minutes / 60,
      mental: row.mental,
      sleep_hours: Number(row.sleep_hours),
      load_hours: row.load_minutes / 60,
    })
    await say(
      chatId,
      `${total} / 25\n\n${axes.map(([l, v]) => `${l}: ${'●'.repeat(v)}${'○'.repeat(5 - v)}`).join('\n')}`,
    )
    return
  }

  if (await handleAnswer(chatId, text)) return
  await say(chatId, '/day — отметить день, /score — сегодняшний счёт.')
}

/** Everyone linked who has not reported today. */
async function dueToday() {
  const { rows } = await db.query(
    `select p.id, p.telegram_chat_id
       from public.profiles p
      where p.telegram_chat_id is not null
        and not exists (
          select 1 from public.day_states d
           where d.user_id = p.id and d.on_date = $1
        )`,
    [utcToday()],
  )
  return rows
}

async function main() {
  await loadEnv()
  token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error(
      'Missing TELEGRAM_BOT_TOKEN in .env.local.\n' +
        'Get one from @BotFather, add the line yourself, and do not paste it anywhere else.',
    )
    process.exit(1)
  }

  db = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  })
  await db.connect()

  const me = await api('getMe', {})
  console.log(`@${me?.username} is listening. Asking at ${ASK_AT_HOUR}:00 local.`)

  let offset = 0
  let askedOn = null

  const poll = async () => {
    const updates = (await api('getUpdates', { offset, timeout: 30 })) ?? []
    for (const update of updates) {
      offset = update.update_id + 1
      try {
        await handleUpdate(update)
      } catch (cause) {
        console.error('update failed:', cause.message)
      }
    }
  }

  const tick = async () => {
    const now = new Date()
    const today = now.toDateString()
    if (now.getHours() !== ASK_AT_HOUR || askedOn === today) return
    askedOn = today
    for (const row of await dueToday()) {
      asking.set(Number(row.telegram_chat_id), { userId: row.id, step: 0, answers: {} })
      await say(Number(row.telegram_chat_id), `Как прошёл день?\n\n${QUESTIONS[0].text}`, QUESTIONS[0].keyboard)
    }
  }

  setInterval(() => void tick().catch((c) => console.error('tick:', c.message)), TICK_MS)
  for (;;) {
    try {
      await poll()
    } catch (cause) {
      console.error('poll failed, retrying:', cause.message)
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}

main().catch((cause) => {
  console.error(cause)
  process.exit(1)
})
