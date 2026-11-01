import 'server-only'

/**
 * The bot, as the deployment speaks it.
 *
 * `scripts/telegram-bot.mjs` is still here and still works: it long-polls from
 * a laptop, which is what you want while developing. This module is the other
 * half — the same five questions reached through a webhook, so the bot runs
 * wherever the app is deployed and needs no process of its own.
 *
 * **Telegram allows one or the other.** Setting a webhook stops getUpdates
 * working, and the script will sit there receiving nothing. Run the script, or
 * the webhook, not both.
 */

const API = 'https://api.telegram.org/bot'

export function hasTelegram() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN)
}

/**
 * The secret Telegram echoes back in a header on every call.
 *
 * Without it the webhook is an open endpoint that writes to day_states for
 * whichever chat id the caller names. The URL is not a secret — it ends up in
 * Telegram's logs and in whatever terminal history set it — so the proof has
 * to be in the request.
 */
export function webhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
}

async function call<T>(method: string, body?: unknown): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null

  const response = await fetch(`${API}${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)
  if (!payload?.ok) {
    console.error('[telegram]', method, payload?.description ?? response.status)
    return null
  }
  return payload.result as T
}

/** Sends a message, with the reply keyboard a question wants. */
export async function say(chatId: number, text: string, keyboard?: string[][]) {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: keyboard
      ? { keyboard: keyboard.map((row) => row.map((label) => ({ text: label }))), resize_keyboard: true, one_time_keyboard: true }
      : { remove_keyboard: true },
  })
}

/** The bot's own @username, for the deep link the app shows. */
export async function botUsername(): Promise<string | null> {
  const me = await call<{ username?: string }>('getMe')
  return me?.username ?? null
}

// ------------------------------------------------------------- questions ---

export type QuestionKey =
  | 'sleep_hours'
  | 'lights_out'
  | 'theory_hours'
  | 'solving_hours'
  | 'load_hours'
  | 'mental'

export type Question = {
  key: QuestionKey
  text: string
  keyboard: string[][]
  parse: (value: string) => number | boolean
}

const number = (value: string) => {
  const parsed = Number(String(value).replace(',', '.').replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/**
 * The five axes, in the order they are asked.
 *
 * Sleep first, because it is about last night and can be answered without
 * thinking about today. The head last, because by then the student has spent a
 * minute recalling the day and the answer is better for it.
 *
 * Kept identical to the script's list on purpose: a student who switches from
 * one to the other should not be asked different questions.
 */
export const QUESTIONS: Question[] = [
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

export type Answers = Partial<Record<QuestionKey, number | boolean>>

const hours = (value: unknown) => (typeof value === 'number' ? value : 0)

/** The answers as day_states stores them. */
export function dayColumns(answers: Answers) {
  return {
    theory_minutes: Math.round(hours(answers.theory_hours) * 60),
    solving_minutes: Math.round(hours(answers.solving_hours) * 60),
    mental: Math.round(hours(answers.mental)),
    sleep_hours: hours(answers.sleep_hours),
    lights_out: answers.lights_out === true,
    load_minutes: Math.round(hours(answers.load_hours) * 60),
  }
}

/** The UTC day, which is what the rest of the app means by "today". */
export function utcToday() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Today's score as a line of pips.
 *
 * The scoring itself comes from lib/day-state.ts — the same function the
 * dashboard draws — rather than a copy. The script had to duplicate it because
 * a plain .mjs cannot load TypeScript that imports the interface dictionary;
 * here there is no such wall, and the bot and the dashboard can no longer
 * disagree about what a day was worth.
 */
export function pips(score: number, max = 5) {
  return '●'.repeat(Math.max(0, score)) + '○'.repeat(Math.max(0, max - score))
}
