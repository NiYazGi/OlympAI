import { readFile } from 'node:fs/promises'
const raw = await readFile('/Users/niya/Desktop/OlympAI/.env.local','utf8')
for (const l of raw.split('\n')) { const t=l.trim(); if(!t||t.startsWith('#'))continue; const e=t.indexOf('='); if(e<0)continue; if(!process.env[t.slice(0,e)])process.env[t.slice(0,e)]=t.slice(e+1) }
const { createAdminClient } = await import('@/lib/supabase/admin')
const { parseFigure } = await import('@/lib/figures')
const admin = createAdminClient()
const { data } = await admin.from('lesson_blocks').select('lesson_id, position, kind, visual_kind, visual').not('visual_kind','is',null).order('lesson_id')
let bad = 0
for (const b of data) {
  const spec = parseFigure(b.visual_kind, b.visual)
  const ok = spec !== null
  if (!ok) bad++
  const extra = spec?.kind === 'plot'
    ? `${spec.lines.length} line(s), ${spec.areas.length} area(s), ${spec.marks.length} mark(s)`
    : spec?.kind === 'forces' ? `${spec.arrows.length} arrows, incline ${spec.incline}°`
    : spec?.kind === 'matrix' ? `highlight ${JSON.stringify(spec.highlight)}` : 'DID NOT PARSE'
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${b.lesson_id.padEnd(38)} block ${b.position} ${String(b.visual_kind).padEnd(7)} ${extra}`)
  // Points must sit inside the declared range, or the drawing runs off the axes.
  if (spec?.kind === 'plot') {
    const all = [...spec.lines.flatMap(l=>l.points), ...spec.areas.flatMap(a=>a.points), ...spec.marks]
    const out = all.filter(p => p.x < spec.xRange[0] || p.x > spec.xRange[1] || p.y < spec.yRange[0] || p.y > spec.yRange[1])
    if (out.length) { console.log(`      ${out.length} point(s) outside the axes:`, JSON.stringify(out.slice(0,3))); bad++ }
  }
}
console.log(`\n${data.length} figure(s), ${bad} problem(s)`)
process.exit(bad === 0 ? 0 : 1)
