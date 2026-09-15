import { readFile } from 'node:fs/promises'
const raw = await readFile('/Users/niya/Desktop/OlympAI/.env.local','utf8')
for (const l of raw.split('\n')) { const t=l.trim(); if(!t||t.startsWith('#'))continue; const e=t.indexOf('='); if(e<0)continue; if(!process.env[t.slice(0,e)])process.env[t.slice(0,e)]=t.slice(e+1) }
const { createAdminClient } = await import('@/lib/supabase/admin')
const admin = createAdminClient()
const { data: p } = await admin.from('profiles').select('primary_subject, target_subject_id, target_competition_id, target_date').single()
const { data: subject } = await admin.from('subjects').select('name').eq('id', p.target_subject_id).maybeSingle()
const { data: comp } = await admin.from('competitions').select('name, subject_id').eq('id', p.target_competition_id).maybeSingle()
const { data: compSubject } = comp?.subject_id ? await admin.from('subjects').select('name').eq('id', comp.subject_id).maybeSingle() : { data: null }
console.log('onboarding subject :', p.primary_subject)
console.log('target subject     :', subject?.name ?? '—')
console.log('target competition :', comp?.name ?? '—', compSubject?.name ? `(${compSubject.name})` : '')
console.log('target date        :', p.target_date)
console.log('\n→ getGoal resolves to:', compSubject?.name ?? subject?.name ?? p.primary_subject)
