/**
 * What the app tells a student to do, across the states they can be in.
 *
 * The counting lives in lib/supabase/study.ts and needs a session; the choosing
 * lives in lib/next-action.ts and does not. This drives the real rules with
 * ladders built from the real content.
 *
 *   node --import ./.tools/register.mjs .tools/live-plan.mjs
 */
import { readFile } from 'node:fs/promises'

const raw = await readFile('/Users/niya/Desktop/OlympAI/.env.local', 'utf8')
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
}

const { createAdminClient } = await import('@/lib/supabase/admin')
const { buildLadder, ladderPercent } = await import('@/lib/ladder')
const { nextAction } = await import('@/lib/next-action')

let failures = 0
const ok = (label, condition, detail = '') => {
  console.log(`${condition ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}
const section = (title) => console.log(`\n${title}\n${'-'.repeat(title.length)}`)

const admin = createAdminClient()
const { data: topicRows } = await admin
  .from('topics')
  .select('id, name, slug, subjects!inner(name, slug)')
  .eq('subjects.slug', 'physics')
const { data: tasks } = await admin.from('tasks').select('id, topic_id, difficulty')
const { data: lessons } = await admin.from('lessons').select('id, topic_id, estimated_minutes')
const { data: blocks } = await admin.from('lesson_blocks').select('lesson_id')
const { data: questions } = await admin.from('quiz_questions').select('id, topic_id')
const { data: cards } = await admin.from('flashcards').select('id, topic_id').is('user_id', null)

const meanDifficulty = (rows) =>
  rows.length === 0 ? Infinity : rows.reduce((s, t) => s + t.difficulty, 0) / rows.length

/** Mirrors buildTopicLadders + getFocusTopics ordering, without a session. */
function plan(overrides = {}) {
  return topicRows
    .map((topic) => {
      const topicTasks = tasks.filter((t) => t.topic_id === topic.id)
      const lesson = lessons.find((l) => l.topic_id === topic.id)
      const q = questions.filter((x) => x.topic_id === topic.id)
      const c = cards.filter((x) => x.topic_id === topic.id)
      const over = overrides[topic.slug] ?? {}

      const input = {
        topicSlug: topic.slug,
        topicName: topic.name,
        subjectName: 'Physics',
        lesson: lesson
          ? {
              id: lesson.id,
              blocks: blocks.filter((b) => b.lesson_id === lesson.id).length,
              minutes: lesson.estimated_minutes,
              opened: false,
              completed: false,
              ...(over.lesson ?? {}),
            }
          : null,
        quiz: { total: q.length, correct: 0, answered: 0, ...(over.quiz ?? {}) },
        cards: { total: c.length, learned: 0, due: 0, ...(over.cards ?? {}) },
        tasks: { total: topicTasks.length, solved: 0, ...(over.tasks ?? {}) },
        mocks: { taken: 0, bestPercent: null, subjectEligible: true, ...(over.mocks ?? {}) },
      }
      const stages = buildLadder(input)
      return {
        slug: topic.slug,
        name: topic.name,
        input,
        stages,
        percent: ladderPercent(stages),
        order: meanDifficulty(topicTasks),
      }
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}

const everything = (over) =>
  Object.fromEntries(topicRows.map((t) => [t.slug, over]))

section('Topic order — easiest first, by the mean difficulty of its problems')
for (const topic of plan()) {
  console.log(`  ${topic.name.padEnd(17)} mean ${topic.order.toFixed(1)}★`)
}
ok('thermodynamics comes before electrodynamics', plan()[0].slug === 'thermodynamics')

section('1. No target chosen')
let action = nextAction(null, plan())
console.log(`  → ${action.label}`)
ok('asks for a target instead of guessing', action.kind === 'choose-subject' && action.href === '/path')

section('2. Fresh start in Physics')
action = nextAction('Physics', plan())
console.log(`  → ${action.label}\n    ${action.detail}\n    ${action.why}`)
ok('opens the easiest topic at the first rung', action.kind === 'study' && action.topicName === 'Thermodynamics')
ok('sends them to the lesson', action.href === '/learn/thermodynamics/lesson')

section('3. Cards fall due in a later topic')
action = nextAction('Physics', plan({ electrodynamics: { cards: { due: 6 } } }))
console.log(`  → ${action.label}\n    ${action.why}`)
ok('the due deck outranks starting a new topic', action.kind === 'recall' && action.topicName === 'Electrodynamics', action.label)

section('4. A lesson left half-read')
action = nextAction('Physics', plan({ mechanics: { lesson: { opened: true } } }))
console.log(`  → ${action.label}`)
ok('finishing it comes before starting anything else', action.kind === 'study' && action.topicName === 'Mechanics')

section('5. Read it — now the quiz')
action = nextAction('Physics', plan({ thermodynamics: { lesson: { opened: true, completed: true } } }))
console.log(`  → ${action.label}\n    ${action.detail}`)
ok('moves to the check step', action.kind === 'check' && action.href === '/learn/thermodynamics/quiz')

section('6. Quiz cleared — now the cards')
action = nextAction('Physics', plan({
  thermodynamics: { lesson: { opened: true, completed: true }, quiz: { correct: 6, answered: 6 } },
}))
console.log(`  → ${action.label}`)
ok('moves to recall', action.kind === 'recall' && action.href === '/learn/thermodynamics/cards')

section('7. Topic learned — now a problem')
action = nextAction('Physics', plan({
  thermodynamics: {
    lesson: { opened: true, completed: true },
    quiz: { correct: 6, answered: 6 },
    cards: { learned: 9 },
  },
}))
console.log(`  → ${action.label}\n    ${action.detail}`)
ok('sends them to the library, filtered to the topic', action.kind === 'apply' && action.href.includes('topic=Thermodynamics'))

section('8. Whole subject done')
const done = everything({
  lesson: { opened: true, completed: true },
  quiz: { correct: 99, answered: 99 },
  cards: { learned: 99 },
  tasks: { solved: 99 },
})
action = nextAction('Physics', plan(done))
console.log(`  → ${action.label}\n    ${action.why}`)
ok('offers the paper', action.kind === 'sit' && action.href === '/mock')

section('9. Paper already sat')
action = nextAction('Physics', plan(everything({
  lesson: { opened: true, completed: true },
  quiz: { correct: 99, answered: 99 },
  cards: { learned: 99 },
  tasks: { solved: 99 },
  mocks: { taken: 1, bestPercent: 72 },
})))
console.log(`  → ${action.label}\n    ${action.why}`)
ok('says so plainly and points elsewhere', action.kind === 'done' && action.href === '/learn?all=1')

section('10. A subject nothing has been written for')
const bare = [{
  slug: 'macroeconomics', name: 'Macroeconomics', percent: 0,
  input: {
    topicSlug: 'macroeconomics', topicName: 'Macroeconomics', subjectName: 'Economics',
    lesson: null,
    quiz: { total: 0, correct: 0, answered: 0 },
    cards: { total: 0, learned: 0, due: 0 },
    tasks: { total: 0, solved: 0 },
    mocks: { taken: 0, bestPercent: null, subjectEligible: false },
  },
  stages: [],
}]
bare[0].stages = buildLadder(bare[0].input)
action = nextAction('Economics', bare)
console.log(`  → ${action.label}\n    ${action.why}`)
ok('does not invent work, and offers the way out', action.kind === 'empty-subject' && action.href === '/learn?all=1')

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`)
process.exit(failures === 0 ? 0 : 1)
