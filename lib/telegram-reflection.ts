import 'server-only'

import { randomUUID } from 'node:crypto'
import { getDb } from '@/lib/db/index'
import { defaultPreparationPreferences } from '@/lib/preparation'
import { trainingToday } from '@/lib/training-time'
import { say } from '@/lib/telegram'

export const REFLECTION_AXES = [
  { key: 'load_score', label: 'Загруженность', question: 'Загруженность: как ты оцениваешь посильность сегодняшней нагрузки по собственной шкале от 0 до 5?' },
  { key: 'solving_score', label: 'Решение', question: 'Решение задач: твоя личная оценка сегодняшней работы от 0 до 5?' },
  { key: 'theory_score', label: 'Теория', question: 'Теория: твоя личная оценка сегодняшней работы от 0 до 5?' },
  { key: 'mental_score', label: 'Ментальное состояние', question: 'Ментальное состояние: твоя личная оценка сегодняшнего состояния от 0 до 5?' },
  { key: 'sleep_score', label: 'Сон', question: 'Сон: твоя личная оценка прошедшей ночи от 0 до 5?' },
] as const
export type ReflectionAxis = typeof REFLECTION_AXES[number]['key']
export type ReflectionScores = Record<ReflectionAxis, number>
export type ReflectionProfile = { id: string; full_name: string | null }
const KEYBOARD = [['0', '1', '2'], ['3', '4', '5']]
const OFF = 'Самооценка в Telegram выключена. Она добровольная. Чтобы включить её, отправь /reflection_on. Это личные отметки по пяти направлениям; критерии Темирлан агая ещё не утверждены.'
const INTRO = 'Добровольная самооценка пяти направлений, каждое — от 0 до 5. Это твоя личная шкала: критерии Темирлан агая ещё не утверждены. Отключить вопросы можно командой /reflection_off.'

type Answers = Partial<ReflectionScores> & {
  _onDate?: string; _lastUpdateId?: number; _promptId?: string
  _pendingPromptId?: string; _pendingPromptState?: 'sending' | 'failed'; _pendingPromptAt?: number
}
export function parseReflectionScore(value: unknown): number | null {
  return typeof value === 'string' && /^[0-5]$/.test(value.trim()) ? Number(value.trim()) : null
}
export function reflectionSummary(scores: ReflectionScores, date: string) {
  const lines = REFLECTION_AXES.map((axis) => `${axis.label}: ${scores[axis.key]}/5`)
  const total = REFLECTION_AXES.reduce((sum, axis) => sum + scores[axis.key], 0)
  return `Личная самооценка · ${date}\n\n${lines.join('\n')}\n\nСумма: ${total}/25. Это не порог успеха и не оценка знаний. Сумма не заменяет пять отдельных значений. Критерии Темирлан агая ещё не утверждены; часы программы по этим отметкам не увеличиваются.`
}

async function enabledProfile(userId: string, chatId: number) {
  const db = await getDb()
  return (await db.query(`select p.id from public.profiles p join public.preparation_preferences f on f.user_id=p.id
    where p.id=$1 and p.telegram_chat_id=$2 and p.telegram_linked_at is not null and f.telegram_reflection_enabled=true`, [userId, chatId])).rows.length > 0
}

/** Only this setting changes. Existing minutes, days and personal goals survive. */
export async function setTelegramReflectionEnabled(userId: string, chatId: number, enabled: boolean) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const profile = (await tx.query<{ training_intensity: string | null }>(`select training_intensity from public.profiles
      where id=$1 and telegram_chat_id=$2 and telegram_linked_at is not null for update`, [userId, chatId])).rows[0]
    if (!profile) return false
    if (enabled) {
      const defaults = defaultPreparationPreferences(profile.training_intensity)
      await tx.query(`insert into public.preparation_preferences(user_id,weekdays,session_minutes,school_grade,daily_tasks,telegram_reflection_enabled)
        values ($1,$2,$3,$4,$5,true) on conflict(user_id) do update set telegram_reflection_enabled=true`,
      [userId, defaults.weekdays, defaults.sessionMinutes, defaults.schoolGrade, defaults.dailyTasks ?? 5])
    } else {
      await tx.query('update public.preparation_preferences set telegram_reflection_enabled=false where user_id=$1', [userId])
      await tx.query('delete from public.telegram_reflection_sessions where user_id=$1 and chat_id=$2', [userId, chatId])
      // Retire any unfinished questionnaire from the old, compulsory bot flow.
      await tx.query('delete from public.telegram_sessions where user_id=$1 and chat_id=$2', [userId, chatId])
    }
    return true
  })
}

/** Creates a persisted session before sending; cron never restarts today's open form. */
export async function beginTelegramReflection(chatId: number, userId: string, mode: 'manual' | 'cron' = 'manual', updateId?: number) {
  const db = await getDb()
  const date = trainingToday()
  const promptId = randomUUID()
  const opened = await db.transaction(async (tx) => {
    const profile = await tx.query(`select p.id from public.profiles p join public.preparation_preferences f on f.user_id=p.id
      where p.id=$1 and p.telegram_chat_id=$2 and p.telegram_linked_at is not null and f.telegram_reflection_enabled=true for update of p`, [userId, chatId])
    if (!profile.rows.length) return false
    const session = (await tx.query<{ answers: Answers }>('select answers from public.telegram_reflection_sessions where chat_id=$1 and user_id=$2 for update', [chatId, userId])).rows[0]
    if (Number.isSafeInteger(updateId) && typeof session?.answers._lastUpdateId === 'number' && updateId! <= session.answers._lastUpdateId) return false
    if (mode === 'cron') {
      if (session?.answers._onDate === date) return false
      if ((await tx.query('select 1 from public.telegram_reflections where user_id=$1 and on_date=$2', [userId, date])).rows.length) return false
    }
    const answers: Answers = { _onDate: date, _promptId: promptId, _pendingPromptId: promptId, _pendingPromptState: 'sending', _pendingPromptAt: Date.now() }
    if (Number.isSafeInteger(updateId)) answers._lastUpdateId = updateId
    await tx.query(`insert into public.telegram_reflection_sessions(chat_id,user_id,step,answers,updated_at) values ($1,$2,0,$3::jsonb,now())
      on conflict(chat_id) do update set user_id=excluded.user_id,step=0,answers=excluded.answers,updated_at=now()`, [chatId, userId, JSON.stringify(answers)])
    return true
  })
  if (!opened) return false
  const sent = await deliverQuestion(chatId, userId, 0, promptId, INTRO)
  // A failed first delivery must not suppress every cron retry for the day.
  if (!sent) await db.query(`delete from public.telegram_reflection_sessions where user_id=$1 and chat_id=$2 and step=0 and answers->>'_pendingPromptId'=$3`, [userId, chatId, promptId])
  return sent
}

export async function dueTelegramReflectionChats() {
  const db = await getDb()
  const { rows } = await db.query<{ user_id: string; chat_id: number }>(`select p.id as user_id,p.telegram_chat_id as chat_id
    from public.profiles p join public.preparation_preferences f on f.user_id=p.id
    where f.telegram_reflection_enabled=true and p.telegram_chat_id is not null and p.telegram_linked_at is not null
      and not exists(select 1 from public.telegram_reflections r where r.user_id=p.id and r.on_date=$1::date)
      and not exists(select 1 from public.telegram_reflection_sessions s where s.user_id=p.id and s.chat_id=p.telegram_chat_id and s.answers->>'_onDate'=$1::text)
    order by p.id`, [trainingToday()])
  return rows.map((row) => ({ userId: row.user_id, chatId: Number(row.chat_id) }))
}

async function report(chatId: number, userId: string) {
  if (!await enabledProfile(userId, chatId)) { await say(chatId, OFF); return }
  const db = await getDb()
  const date = trainingToday()
  const row = (await db.query<ReflectionScores>('select load_score,solving_score,theory_score,mental_score,sleep_score from public.telegram_reflections where user_id=$1 and on_date=$2', [userId, date])).rows[0]
  await say(chatId, row ? reflectionSummary(row, date) : 'За сегодня записи пока нет. /day — добровольно заполнить пять направлений.')
}

/** Keep the next question pending until Telegram accepts its delivery. Replies
 * during an in-flight/failed delivery cannot be attributed to an unseen axis. */
async function deliverQuestion(chatId: number, userId: string, step: number, promptId: string, prefix = '') {
  if (!await enabledProfile(userId, chatId)) return false
  let sent = false
  try { sent = Boolean(await say(chatId, `${prefix ? prefix + '\n\n' : ''}${REFLECTION_AXES[step].question}`, KEYBOARD)) } catch { /* Retry without accepting the next answer. */ }
  const db = await getDb()
  await db.query(`update public.telegram_reflection_sessions set answers=
    case when $4::boolean then answers-'_pendingPromptId'-'_pendingPromptState'-'_pendingPromptAt'
      else jsonb_set(answers,'{_pendingPromptState}','"failed"'::jsonb) end,updated_at=now()
    where user_id=$1 and chat_id=$2 and answers->>'_pendingPromptId'=$3`, [userId, chatId, promptId, sent])
  return sent
}

type AnswerResult = { kind: 'none' | 'off' | 'expired' | 'repeat' | 'invalid' | 'next' | 'pending' | 'done'; step?: number; promptId?: string; scores?: ReflectionScores }
async function answer(chatId: number, userId: string, text: string, updateId?: number): Promise<AnswerResult> {
  const db = await getDb()
  return db.transaction(async (tx): Promise<AnswerResult> => {
    const profile = await tx.query(`select p.id from public.profiles p join public.preparation_preferences f on f.user_id=p.id
      where p.id=$1 and p.telegram_chat_id=$2 and p.telegram_linked_at is not null and f.telegram_reflection_enabled=true for update of p`, [userId, chatId])
    if (!profile.rows.length) {
      await tx.query('delete from public.telegram_reflection_sessions where user_id=$1 and chat_id=$2', [userId, chatId])
      return { kind: 'off' }
    }
    const session = (await tx.query<{ step: number; answers: Answers }>('select step,answers from public.telegram_reflection_sessions where user_id=$1 and chat_id=$2 for update', [userId, chatId])).rows[0]
    if (!session) return { kind: 'none' }
    if (Number.isSafeInteger(updateId) && typeof session.answers._lastUpdateId === 'number' && updateId! <= session.answers._lastUpdateId) return { kind: 'repeat' }
    const date = trainingToday()
    if (session.answers._onDate !== date || !REFLECTION_AXES[session.step]) {
      await tx.query('delete from public.telegram_reflection_sessions where user_id=$1 and chat_id=$2', [userId, chatId])
      return { kind: 'expired' }
    }
    if (session.answers._pendingPromptId) {
      const answers = { ...session.answers }
      if (Number.isSafeInteger(updateId)) answers._lastUpdateId = updateId
      // say() times out after 10 seconds. A crashed worker's lease can also be
      // recovered without interpreting the student's reply as a new score.
      const retry = answers._pendingPromptState === 'failed' || Date.now() - (answers._pendingPromptAt ?? 0) > 15_000
      if (retry) { answers._pendingPromptState = 'sending'; answers._pendingPromptAt = Date.now() }
      await tx.query('update public.telegram_reflection_sessions set answers=$3::jsonb,updated_at=now() where user_id=$1 and chat_id=$2', [userId, chatId, JSON.stringify(answers)])
      return retry ? { kind: 'pending', step: session.step, promptId: answers._pendingPromptId } : { kind: 'repeat' }
    }
    const score = parseReflectionScore(text)
    if (score === null) return { kind: 'invalid', step: session.step }
    const answers = { ...session.answers, [REFLECTION_AXES[session.step].key]: score }
    if (Number.isSafeInteger(updateId)) answers._lastUpdateId = updateId
    if (session.step < 4) {
      const promptId = randomUUID()
      answers._pendingPromptId = promptId
      answers._pendingPromptState = 'sending'
      answers._pendingPromptAt = Date.now()
      await tx.query('update public.telegram_reflection_sessions set step=$3,answers=$4::jsonb,updated_at=now() where user_id=$1 and chat_id=$2', [userId, chatId, session.step + 1, JSON.stringify(answers)])
      return { kind: 'next', step: session.step + 1, promptId }
    }
    const complete = REFLECTION_AXES.every((axis) => Number.isInteger(answers[axis.key]) && answers[axis.key]! >= 0 && answers[axis.key]! <= 5)
    await tx.query('delete from public.telegram_reflection_sessions where user_id=$1 and chat_id=$2', [userId, chatId])
    if (!complete) return { kind: 'expired' }
    const scores = answers as ReflectionScores
    await tx.query(`insert into public.telegram_reflections(user_id,on_date,load_score,solving_score,theory_score,mental_score,sleep_score,criteria_status)
      values($1,$2,$3,$4,$5,$6,$7,'self-report-pending-approval') on conflict(user_id,on_date) do update set
      load_score=excluded.load_score,solving_score=excluded.solving_score,theory_score=excluded.theory_score,
      mental_score=excluded.mental_score,sleep_score=excluded.sleep_score,criteria_status=excluded.criteria_status,created_at=now()`,
    [userId, date, scores.load_score, scores.solving_score, scores.theory_score, scores.mental_score, scores.sleep_score])
    return { kind: 'done', scores }
  })
}

/** Called only after the webhook has authenticated Telegram and resolved its private chat. */
export async function handleTelegramReflection(chatId: number, text: string, profile: ReflectionProfile, updateId?: number) {
  const command = text.split(/\s+/, 1)[0].split('@')[0].toLowerCase()
  if (command === '/reflection_on') {
    if (await setTelegramReflectionEnabled(profile.id, chatId, true)) await beginTelegramReflection(chatId, profile.id, 'manual', updateId)
    return
  }
  if (command === '/reflection_off') {
    await setTelegramReflectionEnabled(profile.id, chatId, false)
    await say(chatId, 'Самооценка выключена, незавершённые вопросы закрыты. Часы и дни подготовки не изменились. Включить снова можно командой /reflection_on.')
    return
  }
  if (command === '/day' || command === '/balance') {
    if (!await enabledProfile(profile.id, chatId)) await say(chatId, OFF)
    else await beginTelegramReflection(chatId, profile.id, 'manual', updateId)
    return
  }
  if (command === '/score') { await report(chatId, profile.id); return }
  if (text.startsWith('/')) { await say(chatId, '/day или /balance — добровольная самооценка, /score — пять сегодняшних отметок, /reflection_on и /reflection_off — включить и выключить.'); return }
  const result = await answer(chatId, profile.id, text, updateId)
  if (result.kind === 'repeat') return
  if (result.kind === 'off') { await say(chatId, OFF); return }
  if (result.kind === 'done') { await say(chatId, reflectionSummary(result.scores!, trainingToday())); return }
  if (result.kind === 'next' || result.kind === 'pending') {
    await deliverQuestion(chatId, profile.id, result.step!, result.promptId!, result.kind === 'pending'
      ? 'Не удалось подтвердить доставку вопроса. Ответь на вопрос ниже ещё раз; последнее число не записано в другое направление.' : '')
    return
  }
  if (result.kind === 'invalid') { await say(chatId, `Нужно целое число от 0 до 5.\n\n${REFLECTION_AXES[result.step!].question}`, KEYBOARD); return }
  if (result.kind === 'expired') { await say(chatId, 'Предыдущая незавершённая запись не переносится на новый день. /day — начать сегодняшнюю.'); return }
  await say(chatId, '/day — добровольно отметить день, /score — посмотреть сегодняшние пять значений. Отключить вопросы: /reflection_off.')
}
