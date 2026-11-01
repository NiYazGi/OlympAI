/**
 * The flame against the live database: visits counted, runs measured, and
 * nobody able to write anyone else's days.
 *
 * Creates two throwaway accounts and deletes them again.
 *
 *   node --import ./.tools/register.mjs .tools/live-flame.mjs
 */
import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const raw = await readFile('/Users/niya/Desktop/olympAI/.env.local', 'utf8')
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq !== -1 && !process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
}
const { createAdminClient } = await import('@/lib/supabase/admin')
const { addDays } = await import('@/lib/flame')
const admin = createAdminClient()

let failures = 0
const ok = (label, condition, detail = '') => {
  console.log(`${condition ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}

const stamp = Date.now()
const password = `flame-${stamp}-${Math.random().toString(36).slice(2)}`
const made = []
async function account(name) {
  const email = `${name}+${stamp}@olympai.test`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  made.push(data.user.id)
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  })
  await client.auth.signInWithPassword({ email, password })
  return { id: data.user.id, client }
}

try {
  const me = await account('flame')
  const other = await account('flame-other')
  const today = new Date().toISOString().slice(0, 10)
  const streak = async (day) => (await me.client.rpc('visit_streak', { today: day })).data?.[0]

  let row = await streak(today)
  ok('no visits, no flame', row?.current_streak === 0 && row?.best_streak === 0)

  // A five-day run ending yesterday, a gap, and a three-day run before it.
  const days = [1, 2, 3, 4, 5, 7, 8, 9].map((n) => addDays(today, -n))
  // Past days through the service role: a student's own session may only
  // record today, which is checked below.
  const { error: seedError } = await admin.from('daily_visits').insert(days.map((day) => ({ user_id: me.id, day })))
  if (seedError) throw seedError
  row = await streak(today)
  ok('a run ending yesterday is still alive', row?.current_streak === 5, `${row?.current_streak}`)
  ok('the longest run is counted', row?.best_streak === 5)

  await me.client.from('daily_visits').insert({ user_id: me.id, day: today })
  row = await streak(today)
  ok('today extends it', row?.current_streak === 6, `${row?.current_streak}`)

  const { error: twice } = await me.client.from('daily_visits').insert({ user_id: me.id, day: today })
  ok('the same day cannot count twice', twice?.code === '23505', twice?.code ?? 'inserted')

  row = await streak(addDays(today, 2))
  ok('a whole missed day puts it out', row?.current_streak === 0)
  ok('…and the record stays', row?.best_streak === 6)

  const { error: backfill } = await me.client
    .from('daily_visits')
    .insert({ user_id: me.id, day: addDays(today, -20) })
  ok('a student cannot record last month', Boolean(backfill), backfill?.message ?? 'it went through')
  const { error: future } = await me.client
    .from('daily_visits')
    .insert({ user_id: me.id, day: addDays(today, 3) })
  ok('…or bank next week', Boolean(future), future?.message ?? 'it went through')

  const { error: forged } = await me.client.from('daily_visits').insert({ user_id: other.id, day: today })
  ok('nobody can record a visit for someone else', Boolean(forged), forged?.message ?? 'it went through')
  const { data: peek } = await other.client.from('daily_visits').select('day').eq('user_id', me.id)
  ok('nobody can read someone else’s visits', (peek ?? []).length === 0)
  const { error: moved } = await me.client.from('daily_visits').delete().eq('user_id', me.id)
  const { data: still } = await admin.from('daily_visits').select('day').eq('user_id', me.id)
  ok('a visit cannot be taken back', (still ?? []).length === 9, moved?.message ?? `${still?.length} left`)
} catch (cause) {
  console.error(cause)
  failures += 1
} finally {
  for (const id of made) await admin.auth.admin.deleteUser(id)
}
console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
