/**
 * Can a signed-in account promote itself? Against the live database.
 *
 * profiles has an "update your own row" policy, and a policy says which rows,
 * not which columns. This signs in as a throwaway student with the publishable
 * key — exactly what a browser holds — and tries to set the columns that are
 * the server's to set. Every one of them must come back unchanged.
 *
 *   node --import ./.tools/register.mjs .tools/live-profile-guard.mjs
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
const admin = createAdminClient()

let failures = 0
const ok = (label, condition, detail = '') => {
  console.log(`${condition ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}

const stamp = Date.now()
const password = `guard-${stamp}-${Math.random().toString(36).slice(2)}`
const email = `guard+${stamp}@olympai.test`
const { data: made, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
if (error) throw error
const id = made.user.id

try {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  })
  await client.auth.signInWithPassword({ email, password })

  for (const [column, value] of [
    ['is_admin', true],
    ['role', 'teacher'],
    ['telegram_chat_id', 12345],
  ]) {
    await client.from('profiles').update({ [column]: value }).eq('id', id)
    const { data } = await admin.from('profiles').select(column).eq('id', id).single()
    ok(`a student cannot set ${column}`, data[column] !== value, `now ${JSON.stringify(data[column])}`)
  }

  const { error: own } = await client.from('profiles').update({ full_name: 'Still Mine' }).eq('id', id)
  const { data: named } = await admin.from('profiles').select('full_name').eq('id', id).single()
  ok('…but can still change their own name', !own && named.full_name === 'Still Mine', own?.message ?? '')
} finally {
  await admin.auth.admin.deleteUser(id)
}
console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
