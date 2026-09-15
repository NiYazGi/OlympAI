import { readFile } from 'node:fs/promises'
import pg from 'pg'
const raw = await readFile('/Users/niya/Desktop/OlympAI/.env.local','utf8')
for (const l of raw.split('\n')) { const t=l.trim(); if(!t||t.startsWith('#'))continue; const e=t.indexOf('='); if(e<0)continue; if(!process.env[t.slice(0,e)])process.env[t.slice(0,e)]=t.slice(e+1) }
const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl:{rejectUnauthorized:false} }); await c.connect()

console.log('RLS and policies, public schema')
console.log('-'.repeat(52))
const { rows } = await c.query(`
  select t.tablename,
         t.rowsecurity as rls,
         count(p.policyname)::int as policies,
         count(*) filter (where p.cmd = 'SELECT')::int as sel,
         count(*) filter (where p.cmd in ('INSERT','UPDATE','DELETE','ALL'))::int as writes
  from pg_tables t
  left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
  where t.schemaname = 'public'
  group by 1,2 order by 1`)
let problems = 0
for (const r of rows) {
  const flag = !r.rls ? 'NO RLS   ' : r.policies === 0 ? 'NO POLICY' : '   ok    '
  if (!r.rls || r.policies === 0) problems++
  console.log(`  ${flag} ${r.tablename.padEnd(26)} ${r.policies} policy(ies): ${r.sel} read, ${r.writes} write`)
}
console.log(`\n${problems} table(s) needing attention`)

const { rows: cols } = await c.query(`
  select table_name, column_name from information_schema.columns
  where table_schema='public' and column_name in ('official_solution','correct_index','explanation')`)
console.log('\nAnswer-key columns, readable by the browser role?')
for (const r of cols) {
  const { rows: g } = await c.query(`select has_column_privilege('authenticated', $1, $2, 'SELECT') as can`, ['public.'+r.table_name, r.column_name])
  console.log(`  ${g[0].can ? 'EXPOSED ' : 'withheld'}  ${r.table_name}.${r.column_name}`)
}

const { rows: counts } = await c.query(`
  select 'tasks' t, count(*)::int n from tasks
  union all select 'lessons', count(*)::int from lessons
  union all select 'quiz_questions', count(*)::int from quiz_questions
  union all select 'flashcards', count(*)::int from flashcards
  union all select 'competitions', count(*)::int from competitions
  union all select 'resources', count(*)::int from resources
  union all select 'task_attempts', count(*)::int from task_attempts
  order by 1`)
console.log('\nContent and usage')
for (const r of counts) console.log(`  ${String(r.n).padStart(4)}  ${r.t}`)

const { rows: subj } = await c.query(`
  select s.name, count(t.id)::int as n from subjects s
  left join tasks t on t.subject_id = s.id group by 1 order by 2`)
console.log('\nProblems per subject (a mock paper needs 3)')
for (const r of subj) console.log(`  ${r.n < 3 ? 'TOO FEW' : '   ok  '} ${String(r.n).padStart(2)}  ${r.name}`)
await c.end()
