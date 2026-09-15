import { readFile } from 'node:fs/promises'
import pg from 'pg'
const raw = await readFile('/Users/niya/Desktop/OlympAI/.env.local','utf8')
for (const l of raw.split('\n')) { const t=l.trim(); if(!t||t.startsWith('#'))continue; const e=t.indexOf('='); if(e<0)continue; if(!process.env[t.slice(0,e)])process.env[t.slice(0,e)]=t.slice(e+1) }
const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl:{rejectUnauthorized:false} }); await c.connect()
const checks = [
  ['tasks','official_solution'], ['tasks','hints'], ['tasks','problem'],
  ['quiz_questions','correct_index'], ['quiz_questions','explanation'], ['quiz_questions','prompt'],
]
for (const role of ['authenticated','anon']) {
  console.log(`\nrole ${role}`)
  for (const [t, col] of checks) {
    const { rows } = await c.query(
      `select has_column_privilege($1, $2, $3, 'SELECT') as can`, [role, 'public.'+t, col])
    console.log(`  ${rows[0].can ? 'CAN READ ' : 'no access'}  ${t}.${col}`)
  }
}
const { rows: counts } = await c.query(`
  select 'lessons' t, count(*)::int n from lessons
  union all select 'lesson_blocks', count(*)::int from lesson_blocks
  union all select 'quiz_questions', count(*)::int from quiz_questions
  union all select 'flashcards', count(*)::int from flashcards order by 1`)
console.log('\ncontent:'); for (const r of counts) console.log(`  ${String(r.n).padStart(3)}  ${r.t}`)
await c.end()
