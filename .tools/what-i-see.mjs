/** What this account is told to do, given what is actually in the database. */
import { readFile } from 'node:fs/promises'
const raw = await readFile('/Users/niya/Desktop/OlympAI/.env.local','utf8')
for (const l of raw.split('\n')) { const t=l.trim(); if(!t||t.startsWith('#'))continue; const e=t.indexOf('='); if(e<0)continue; if(!process.env[t.slice(0,e)])process.env[t.slice(0,e)]=t.slice(e+1) }
const { createAdminClient } = await import('@/lib/supabase/admin')
const { buildLadder, ladderPercent } = await import('@/lib/ladder')
const { nextAction } = await import('@/lib/next-action')
const admin = createAdminClient()

const { data: subjects } = await admin.from('subjects').select('id, name, slug').order('name')
const { data: topics } = await admin.from('topics').select('id, name, slug, subject_id')
const { data: tasks } = await admin.from('tasks').select('id, topic_id, subject_id, difficulty')
const { data: lessons } = await admin.from('lessons').select('id, topic_id, estimated_minutes')
const { data: blocks } = await admin.from('lesson_blocks').select('lesson_id')
const { data: questions } = await admin.from('quiz_questions').select('id, topic_id')
const { data: cards } = await admin.from('flashcards').select('id, topic_id').is('user_id', null)

console.log('Study content by subject\n' + '-'.repeat(24))
for (const s of subjects) {
  const ts = topics.filter((t) => t.subject_id === s.id)
  const l = lessons.filter((x) => ts.some((t) => t.id === x.topic_id)).length
  const q = questions.filter((x) => ts.some((t) => t.id === x.topic_id)).length
  const c = cards.filter((x) => ts.some((t) => t.id === x.topic_id)).length
  const k = tasks.filter((x) => x.subject_id === s.id).length
  const mark = l > 0 ? '●' : '○'
  console.log(`  ${mark} ${s.name.padEnd(17)} ${l} lesson(s) · ${String(q).padStart(2)} questions · ${String(c).padStart(2)} cards · ${k} problems`)
}

const mean = (rows) => rows.length === 0 ? Infinity : rows.reduce((s, t) => s + t.difficulty, 0) / rows.length

for (const subjectName of ['Economics', 'Physics']) {
  const subject = subjects.find((s) => s.name === subjectName)
  const plan = topics.filter((t) => t.subject_id === subject.id).map((topic) => {
    const topicTasks = tasks.filter((t) => t.topic_id === topic.id)
    const lesson = lessons.find((l) => l.topic_id === topic.id)
    const input = {
      topicSlug: topic.slug, topicName: topic.name, subjectName,
      lesson: lesson ? { id: lesson.id, blocks: blocks.filter((b) => b.lesson_id === lesson.id).length, minutes: lesson.estimated_minutes, opened: false, completed: false } : null,
      quiz: { total: questions.filter((q) => q.topic_id === topic.id).length, correct: 0, answered: 0 },
      cards: { total: cards.filter((c) => c.topic_id === topic.id).length, learned: 0, due: 0 },
      tasks: { total: topicTasks.length, solved: 0 },
      mocks: { taken: 0, bestPercent: null, subjectEligible: tasks.filter((t) => t.subject_id === subject.id).length >= 3 },
    }
    const stages = buildLadder(input)
    return { slug: topic.slug, name: topic.name, input, stages, percent: ladderPercent(stages), order: mean(topicTasks) }
  }).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))

  const action = nextAction(subjectName, plan)
  console.log(`\nA fresh account targeting ${subjectName}\n` + '-'.repeat(26 + subjectName.length))
  console.log(`  order: ${plan.map((t) => t.name).join(' → ')}`)
  console.log(`  → ${action.label}`)
  console.log(`    ${action.detail}`)
  console.log(`    ${action.why}`)
  console.log(`    ${action.cta} → ${action.href}`)
}
