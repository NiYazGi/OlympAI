import { readFile } from 'node:fs/promises'
const raw = await readFile('/Users/niya/Desktop/OlympAI/.env.local','utf8')
for (const l of raw.split('\n')) { const t=l.trim(); if(!t||t.startsWith('#'))continue; const e=t.indexOf('='); if(e<0)continue; if(!process.env[t.slice(0,e)])process.env[t.slice(0,e)]=t.slice(e+1) }
const { createAdminClient } = await import('@/lib/supabase/admin')
const a = createAdminClient()
const n = async (t, q) => { const r = await (q ? q(a.from(t).select('id', { count:'exact', head:true })) : a.from(t).select('id', { count:'exact', head:true })); return r.count }
console.log('subjects        ', await n('subjects'))
console.log('topics          ', await n('topics'))
console.log('lessons         ', await n('lessons'))
console.log('lesson_blocks   ', await n('lesson_blocks'))
console.log('quiz_questions  ', await n('quiz_questions'))
console.log('flashcards      ', await n('flashcards'))
console.log('figures         ', (await a.from('lesson_blocks').select('id',{count:'exact',head:true}).not('visual_kind','is',null)).count)
console.log('tasks           ', await n('tasks'))
console.log('competitions    ', await n('competitions'))
console.log('accounts        ', await n('profiles'))
console.log('task_attempts   ', await n('task_attempts'))
