import { readFile } from 'node:fs/promises'
import pg from 'pg'
const ROOT = '/Users/niya/Desktop/OlympAI'
const raw = await readFile(ROOT + '/.env.local', 'utf8')
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
}
const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
await c.connect()
const tables = (await c.query(`select table_name from information_schema.tables where table_schema='public' order by 1`)).rows.map(r => r.table_name)
console.log('tables:', tables.join(', '))
for (const t of tables) {
  const n = (await c.query(`select count(*)::int as n from public."${t}"`)).rows[0].n
  console.log(String(n).padStart(6), t)
}
console.log('\n-- tasks by subject --')
console.log((await c.query(`select s.name, count(t.id)::int as n from subjects s left join topics tp on tp.subject_id=s.id left join tasks t on t.topic_id=tp.id group by s.name order by n desc`)).rows.map(r=>`${String(r.n).padStart(4)}  ${r.name}`).join('\n'))
console.log('\n-- users --')
console.log((await c.query(`select count(*)::int as n from auth.users`)).rows[0].n, 'auth users')
await c.end()
