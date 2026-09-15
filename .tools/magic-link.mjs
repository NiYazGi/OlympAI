/**
 * One-time sign-in link for the existing account, generated with the service
 * key. Written to a local file rather than printed, so the token stays out of
 * the transcript. Single use, expires on its own.
 */
import { readFile, writeFile } from 'node:fs/promises'

const raw = await readFile('/Users/niya/Desktop/OlympAI/.env.local', 'utf8')
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
}

const { createAdminClient } = await import('@/lib/supabase/admin')
const admin = createAdminClient()

const { data: list, error: listError } = await admin.auth.admin.listUsers()
if (listError || !list?.users?.length) {
  console.error('Could not list users:', listError?.message)
  process.exit(1)
}
const user = list.users[0]

const { data, error } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: user.email,
  options: { redirectTo: 'http://localhost:3000/auth/callback?next=/dashboard' },
})
if (error) {
  console.error('generateLink failed:', error.message)
  process.exit(1)
}

const link = data.properties.action_link
const out = process.argv[2]
await writeFile(
  out,
  `<!doctype html><meta charset="utf-8"><title>Signing in…</title>` +
    `<meta http-equiv="refresh" content="0;url=${link.replace(/&/g, '&amp;')}">` +
    `<p style="font:16px system-ui;padding:2rem">Signing in…</p>`,
)

const parsed = new URL(link)
console.log(`link written to ${out}`)
console.log(`  verify host : ${parsed.host}`)
console.log(`  redirect_to : ${parsed.searchParams.get('redirect_to')}`)
console.log(`  account     : ${user.email.replace(/^(.).*(@.*)$/, '$1***$2')}`)
