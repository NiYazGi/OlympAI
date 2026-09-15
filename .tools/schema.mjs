import { readFile } from 'node:fs/promises'
import pg from 'pg'
const raw = await readFile('/Users/niya/Desktop/OlympAI/.env.local', 'utf8')
for (const line of raw.split('\n')) { const t=line.trim(); if(!t||t.startsWith('#'))continue; const e=t.indexOf('='); if(e<0)continue; if(!process.env[t.slice(0,e)])process.env[t.slice(0,e)]=t.slice(e+1) }
const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl:{rejectUnauthorized:false} })
await c.connect()
for (const t of ['tasks','topics','subjects','task_attempts','mock_tests','profiles']) {
  const r = await c.query(`select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`, [t])
  console.log(`\n== ${t} ==`)
  for (const col of r.rows) console.log(`  ${col.column_name.padEnd(22)} ${col.data_type}${col.is_nullable==='NO'?' NOT NULL':''}${col.column_default?' default '+col.column_default:''}`)
}
const s = await c.query(`select id, title, difficulty, licence, source_url from tasks order by id`)
console.log('\n== tasks ==')
for (const r of s.rows) console.log(` ${String(r.difficulty)}★ ${r.id.padEnd(28)} ${r.licence.padEnd(9)} ${r.title}`)
await c.end()
