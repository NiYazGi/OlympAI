import { readFile } from 'node:fs/promises'
const raw = await readFile('/Users/niya/Desktop/OlympAI/.env.local','utf8')
for (const l of raw.split('\n')) { const t=l.trim(); if(!t||t.startsWith('#'))continue; const e=t.indexOf('='); if(e<0)continue; if(!process.env[t.slice(0,e)])process.env[t.slice(0,e)]=t.slice(e+1) }
const { createAdminClient } = await import('@/lib/supabase/admin')
const admin = createAdminClient()
const { data: subs } = await admin.from('subjects').select('id, name, slug').order('name')
const { data: tops } = await admin.from('topics').select('id, name, slug, subject_id')
const { data: tasks } = await admin.from('tasks').select('id, topic_id, difficulty')
for (const s of subs) {
  console.log(`\n${s.name}  (${s.slug})`)
  for (const t of tops.filter(x => x.subject_id === s.id)) {
    const n = tasks.filter(x => x.topic_id === t.id)
    console.log(`   ${t.slug.padEnd(26)} ${t.name.padEnd(30)} ${n.length} task(s) ${n.map(x=>x.difficulty+'*').join(' ')}`)
  }
}
