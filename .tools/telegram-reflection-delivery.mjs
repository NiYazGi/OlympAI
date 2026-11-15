// node --import ./.tools/register.mjs .tools/telegram-reflection-delivery.mjs
// Isolated in-memory database + stub transport. Never opens app data or Telegram.
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const calls = []
let behavior = 'ok'
let gate
let entered
const fixture = {
  db,
  async say(chatId, text) {
    calls.push({ chatId, text })
    const chosen = behavior
    behavior = 'ok'
    if (chosen === 'throw') throw new Error('Injected transport failure')
    if (chosen === 'null') return null
    if (chosen === 'defer') { entered(); return gate }
    return { message_id: calls.length }
  },
}
globalThis.__olympaiTelegramDeliveryTest = fixture
const dbStub = 'data:text/javascript,' + encodeURIComponent('export async function getDb(){return globalThis.__olympaiTelegramDeliveryTest.db}')
const telegramStub = 'data:text/javascript,' + encodeURIComponent('export async function say(...args){return globalThis.__olympaiTelegramDeliveryTest.say(...args)}')
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier,context,nextResolve){
 if(specifier==='@/lib/db/index')return {url:${JSON.stringify(dbStub)},shortCircuit:true};
 if(specifier==='@/lib/telegram')return {url:${JSON.stringify(telegramStub)},shortCircuit:true};
 return nextResolve(specifier,context);
}`), import.meta.url)
const previousFetch = globalThis.fetch
globalThis.fetch = () => { throw new Error('Network is forbidden in this test') }
try {
  await db.exec(`
    create table profiles(id text primary key,full_name text,training_intensity text,telegram_chat_id bigint,telegram_linked_at timestamptz);
    create table preparation_preferences(user_id text primary key,weekdays int[],session_minutes int,school_grade int,daily_tasks int,telegram_reflection_enabled boolean default false);
    create table telegram_reflection_sessions(chat_id bigint primary key,user_id text,step int,answers jsonb,updated_at timestamptz);
    create table telegram_sessions(chat_id bigint,user_id text);
    create table telegram_reflections(user_id text,on_date date,load_score int,solving_score int,theory_score int,mental_score int,sleep_score int,criteria_status text,created_at timestamptz default now(),primary key(user_id,on_date));
    insert into profiles values('student','Fixture',null,1001,now());
    insert into preparation_preferences values('student',array[1,3],30,10,3,false);
  `)
  const { beginTelegramReflection, dueTelegramReflectionChats, handleTelegramReflection, setTelegramReflectionEnabled } = await import('../lib/telegram-reflection.ts')
  const profile = { id: 'student', full_name: 'Fixture' }
  const current = async () => (await db.query('select * from telegram_reflection_sessions')).rows[0]
  assert.equal(await beginTelegramReflection(1001, 'student', 'cron'), false)
  assert.equal(calls.length, 0, 'No automatic prompts without consent')
  await setTelegramReflectionEnabled('student', 1001, true)
  assert.deepEqual((await db.query('select weekdays,session_minutes,daily_tasks from preparation_preferences')).rows[0], { weekdays: [1,3], session_minutes:30, daily_tasks:3 }, 'Opt-in preserves agreed load')
  behavior = 'throw'
  assert.equal(await beginTelegramReflection(1001, 'student', 'cron'), false)
  assert.equal(await current(), undefined, 'Throwing initial delivery leaves no stuck session')
  assert.equal((await dueTelegramReflectionChats()).length, 1, 'Cron can retry failed initial delivery')
  behavior = 'null'
  assert.equal(await beginTelegramReflection(1001, 'student', 'cron'), false)
  assert.equal(await current(), undefined)
  assert.equal(await beginTelegramReflection(1001, 'student', 'manual', 100), true)
  assert.equal((await current()).answers._pendingPromptId, undefined)

  behavior = 'null'
  await handleTelegramReflection(1001, '4', profile, 101)
  assert.equal((await current()).step, 1)
  assert.equal((await current()).answers.load_score, 4)
  assert.equal((await current()).answers._pendingPromptState, 'failed')
  await handleTelegramReflection(1001, '2', profile, 102)
  assert.equal((await current()).answers.solving_score, undefined, 'A reply to an undelivered prompt is not assigned to an unseen axis')
  assert.match(calls.at(-1).text, /Не удалось подтвердить доставку вопроса/)
  assert.match(calls.at(-1).text, /Решение задач/)
  await handleTelegramReflection(1001, '2', profile, 102)
  assert.equal((await current()).step, 1, 'A replayed discarded reply stays discarded')
  await handleTelegramReflection(1001, '3', profile, 103)
  assert.equal((await current()).step, 2)
  assert.equal((await current()).answers.solving_score, 3)

  let release
  let promptStarted
  gate = new Promise((resolve) => { release = resolve })
  promptStarted = new Promise((resolve) => { entered = resolve })
  behavior = 'defer'
  const sending = handleTelegramReflection(1001, '2', profile, 104)
  await promptStarted
  await handleTelegramReflection(1001, '5', profile, 105)
  assert.equal((await current()).answers.mental_score, undefined, 'Replies while the next prompt is in-flight do not fill its axis')
  release({ message_id: 99 })
  await sending
  await handleTelegramReflection(1001, '5', profile, 105)
  assert.equal((await current()).answers.mental_score, undefined, 'In-flight ignored reply cannot be replayed after delivery')
  await handleTelegramReflection(1001, '5', profile, 106)
  await handleTelegramReflection(1001, '1', profile, 107)
  assert.equal(await current(), undefined)
  const report = (await db.query('select load_score,solving_score,theory_score,mental_score,sleep_score,criteria_status from telegram_reflections')).rows[0]
  assert.deepEqual(report, {load_score:4,solving_score:3,theory_score:2,mental_score:5,sleep_score:1,criteria_status:'self-report-pending-approval'})

  await beginTelegramReflection(1001, 'student', 'manual', 110)
  await handleTelegramReflection(1001, '1', profile, 111)
  assert.equal(await beginTelegramReflection(1001, 'student', 'manual', 110), false, 'Old retried /day does not reset newer answers')
  assert.equal((await current()).step, 1)
  behavior = 'throw'
  await handleTelegramReflection(1001, '2', profile, 112)
  assert.equal((await current()).answers._pendingPromptState, 'failed')
  await setTelegramReflectionEnabled('student', 1001, false)
  assert.equal(await current(), undefined, 'Opt-out clears failed pending prompts')
  assert.equal((await dueTelegramReflectionChats()).length, 0)
  assert.equal(await beginTelegramReflection(1001, 'student', 'cron'), false)
  console.log('PASS: Telegram delivery failures, retryable cron, unseen-axis safety, in-flight/replayed answers, five independent values and voluntary opt-out. No network calls.')
} finally {
  globalThis.fetch = previousFetch
  delete globalThis.__olympaiTelegramDeliveryTest
  await db.close()
}
