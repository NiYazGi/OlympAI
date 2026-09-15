import { readFile } from 'node:fs/promises'
const raw = await readFile('/Users/niya/Desktop/OlympAI/.env.local','utf8')
for (const l of raw.split('\n')) { const t=l.trim(); if(!t||t.startsWith('#'))continue; const e=t.indexOf('='); if(e<0)continue; if(!process.env[t.slice(0,e)])process.env[t.slice(0,e)]=t.slice(e+1) }
const { createAdminClient } = await import('@/lib/supabase/admin')
const admin = createAdminClient()
const { data } = await admin.from('competitions').select('level')
const counts = {}
for (const r of data) counts[r.level ?? 'null'] = (counts[r.level ?? 'null'] ?? 0) + 1
console.log(counts)
