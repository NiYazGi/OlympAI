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
// buildLadder takes the dictionary since the interface became bilingual; this
// script was still calling it with one argument and died on `t.ladder`.
const { en: t } = await import('@/lib/i18n/dictionaries/en')
// Wrapped rather than called directly: both of these take the dictionary now
// that the interface is bilingual, and `t` is the same for every call here.
const { nextAction: chooseAction } = await import('@/lib/next-action')
const nextAction = (subject, topics, recommended = null) =>
  chooseAction(subject, topics, recommended, t)

let failures = 0
const ok = (label, condition, detail = '') => {
  console.log(`${condition ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}
const section = (title) => console.log(`\n${title}\n${'-'.repeat(title.length)}`)

const admin = createAdminClient()
const { data: topicRows } = await admin
  .from('topics')
  .select('id, name, slug, position, subjects!inner(name, slug)')
  .eq('subjects.slug', 'physics')
const { data: tasks } = await admin.from('tasks').select('id, topic_id, difficulty')
const { data: lessons } = await admin.from('lessons').select('id, topic_id, estimated_minutes')
const { data: blocks } = await admin.from('lesson_blocks').select('lesson_id')
const { data: questions } = await admin.from('quiz_questions').select('id, topic_id')
const { data: cards } = await admin.from('flashcards').select('id, topic_id').is('user_id', null)

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
      const stages = buildLadder(input, t)
      return {
        slug: topic.slug,
        name: topic.name,
        input,
        stages,
        percent: ladderPercent(stages),
        order: topic.position,
      }
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}

const everything = (over) =>
  Object.fromEntries(topicRows.map((t) => [t.slug, over]))

// The syllabus, since migration 44 — not the mean difficulty of whatever has
// been imported. Kinematics opens physics; fields come after mechanics.
section('Topic order — the syllabus')
for (const topic of plan()) {
  console.log(`  ${topic.name.padEnd(24)} ${topic.order}`)
}
ok('kinematics opens the subject', plan()[0].slug === 'kinematics')
const slugs = plan().map((topic) => topic.slug)
ok(
  'mechanics comes before the fields',
  slugs.indexOf('mechanics') < slugs.indexOf('electrodynamics'),
)

section('1. No target chosen')
let action = nextAction(null, plan())
console.log(`  → ${action.label}`)
// /path was merged into /learn; the check was still asserting the old route.
ok('asks for a target instead of guessing', action.kind === 'choose-subject' && action.href === '/learn')

section('2. Fresh start in Physics')
action = nextAction('Physics', plan())
console.log(`  → ${action.label}\n    ${action.detail}\n    ${action.why}`)
// The first topic of the syllabus that has anything written for it. Kinematics
// opens the course and has problems but no lesson yet, so the ladder starts at
// Mechanics — which is the honest answer, not a fallback.
ok('opens the first written topic at the first rung', action.kind === 'study' && action.topicName === 'Mechanics')
ok('sends them to the lesson', action.href === '/learn/mechanics/lesson')

section('3. Cards fall due in a later topic')
action = nextAction('Physics', plan({ electrodynamics: { cards: { due: 6 } } }))
console.log(`  → ${action.label}\n    ${action.why}`)
// The deck used to win here. It was demoted on purpose in September — cards
// are optional, they pay no XP, and a due deck in a topic the student has not
// started is not the next thing to do. The check now asserts the demotion.
ok('a due deck does not outrank starting the topic', action.kind === 'study', action.label)

section('4. A lesson left half-read, further down the course')
action = nextAction('Physics', plan({ thermodynamics: { lesson: { opened: true } } }))
console.log(`  → ${action.label}`)
ok(
  'finishing it comes before starting anything else',
  action.kind === 'study' && action.topicName === 'Thermodynamics',
)

section('5. Read it — now the quiz')
action = nextAction('Physics', plan({ mechanics: { lesson: { opened: true, completed: true } } }))
console.log(`  → ${action.label}\n    ${action.detail}`)
ok('moves to the check step', action.kind === 'check' && action.href === '/learn/mechanics/quiz')

section('6. Quiz cleared — now a problem, not the cards')
action = nextAction('Physics', plan({
  mechanics: { lesson: { opened: true, completed: true }, quiz: { correct: 6, answered: 6 } },
}))
console.log(`  → ${action.label}`)
// Same demotion: read, check, then solve. The deck sits beside the ladder
// rather than on it.
ok('moves to the problem', action.kind === 'apply', action.label)

section('7. Topic learned — now a problem')
action = nextAction('Physics', plan({
  mechanics: {
    lesson: { opened: true, completed: true },
    quiz: { correct: 6, answered: 6 },
    cards: { learned: 9 },
  },
}))
console.log(`  → ${action.label}\n    ${action.detail}`)
ok('sends them to the library, filtered to the topic', action.kind === 'apply' && action.href.includes('topic=Mechanics'))

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
bare[0].stages = buildLadder(bare[0].input, t)
action = nextAction('Economics', bare)
console.log(`  → ${action.label}\n    ${action.why}`)
ok('does not invent work, and offers the way out', action.kind === 'empty-subject' && action.href === '/learn?all=1')

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`)
process.exit(failures === 0 ? 0 : 1)
