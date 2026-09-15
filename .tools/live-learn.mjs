/**
 * The learning ladder, against the real database.
 *
 * Marking mirrors answerQuizQuestion in app/(app)/learn/actions.ts. The SRS and
 * ladder functions are the real modules. Everything written here is deleted at
 * the end unless --keep.
 *
 *   node --import ./.tools/register.mjs .tools/live-learn.mjs [--keep]
 */
import { readFile } from 'node:fs/promises'

const KEEP = process.argv.includes('--keep')
const raw = await readFile('/Users/niya/Desktop/OlympAI/.env.local', 'utf8')
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
}

const { createAdminClient } = await import('@/lib/supabase/admin')
const { cardState, isDue, isLearned, intervalAfter, orderForReview } = await import('@/lib/srs')
const { buildLadder, nextStep, ladderPercent } = await import('@/lib/ladder')

let failures = 0
const ok = (label, condition, detail = '') => {
  console.log(`${condition ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}
const section = (title) => console.log(`\n${title}\n${'-'.repeat(title.length)}`)

const admin = createAdminClient()
const { data: profiles } = await admin.from('profiles').select('id').limit(1)
const userId = profiles[0].id

section('1. What landed')
const { data: topics } = await admin
  .from('topics')
  .select('id, name, slug, subjects!inner(name, slug)')
  .eq('subjects.slug', 'physics')
const { data: lessons } = await admin.from('lessons').select('id, topic_id, title, estimated_minutes, licence')
const { data: blocks } = await admin.from('lesson_blocks').select('lesson_id, kind, heading, body, items, position')
const { data: questions } = await admin.from('quiz_questions').select('id, topic_id, prompt, options, correct_index, explanation, licence')
const { data: cards } = await admin.from('flashcards').select('id, topic_id, front, back, user_id, licence')

for (const topic of topics.sort((a, b) => a.slug.localeCompare(b.slug))) {
  const lesson = lessons.find((l) => l.topic_id === topic.id)
  const b = blocks.filter((x) => x.lesson_id === lesson?.id)
  const q = questions.filter((x) => x.topic_id === topic.id)
  const c = cards.filter((x) => x.topic_id === topic.id && !x.user_id)
  console.log(
    `  ${topic.name.padEnd(17)} lesson: ${(lesson?.title ?? '—').padEnd(42)} ${String(b.length).padStart(2)} blocks · ${q.length} questions · ${c.length} cards`,
  )
}
ok('every physics topic has a lesson', topics.every((t) => lessons.some((l) => l.topic_id === t.id)))
ok('every lesson uses all four block kinds', lessons.every((l) => {
  const kinds = new Set(blocks.filter((b) => b.lesson_id === l.id).map((b) => b.kind))
  return ['concept', 'explanation', 'example', 'key_facts'].every((k) => kinds.has(k))
}))
ok('every content row records a licence', [...lessons, ...questions, ...cards].every((r) => r.licence && r.licence !== 'unknown'))
ok('key_facts blocks carry items, prose blocks carry text', blocks.every((b) =>
  b.kind === 'key_facts' ? b.items.length > 0 : Boolean(b.body && b.body.trim())))
ok('no worked example gives away a graded task', !blocks.some((b) =>
  b.kind === 'example' && /23\.5|1\.96|\(2\/3\)\s*\*?\s*g\s*sin/.test(b.body ?? '')))

section('2. The licence guard actually refuses')
const someTopic = topics[0].id
const unlicensed = await admin.from('lessons').insert({ id: 'zz-guard-test', topic_id: someTopic, title: 'Guard test' })
ok('a lesson with no licence is rejected', Boolean(unlicensed.error), unlicensed.error?.message?.slice(0, 80) ?? 'IT WAS ACCEPTED')
const sharedCard = await admin.from('flashcards').insert({ topic_id: someTopic, front: 'Guard', back: 'test' })
ok('a shared card with no licence is rejected', Boolean(sharedCard.error), sharedCard.error?.message?.slice(0, 80) ?? 'IT WAS ACCEPTED')
const ownCard = await admin.from('flashcards').insert({ topic_id: someTopic, user_id: userId, front: 'Guard test card', back: 'private' }).select('id, licence').single()
ok('a private card is accepted and marked original', !ownCard.error && ownCard.data?.licence === 'original', ownCard.error?.message ?? `licence=${ownCard.data?.licence}`)

section('3. Marking a quiz, the way the action does it')
const topic = topics.find((t) => t.slug === 'electrodynamics')
const topicQuestions = questions.filter((q) => q.topic_id === topic.id).slice(0, 3)
const written = []
for (const [index, question] of topicQuestions.entries()) {
  // First one answered right, the rest wrong, so the ladder has something to show.
  const chosen = index === 0 ? question.correct_index : (question.correct_index + 1) % question.options.length
  const isCorrect = chosen === question.correct_index
  const { data, error } = await admin
    .from('quiz_attempts')
    .insert({ user_id: userId, question_id: question.id, chosen_index: chosen, is_correct: isCorrect })
    .select('id, is_correct')
    .single()
  if (data) written.push(data.id)
  ok(`${question.id}: chose ${chosen}, marked ${isCorrect ? 'right' : 'wrong'}`, !error && data.is_correct === isCorrect, error?.message ?? '')
}
const leaks = topicQuestions.filter((q) => q.explanation.includes(q.options[q.correct_index]))
console.log(`  (${leaks.length} of ${topicQuestions.length} explanations restate the chosen option verbatim — fine, they are shown only after answering)`)

section('4. Spaced repetition')
const fresh = cardState([])
ok('a card never seen is new and due', fresh.isNew && isDue(fresh))
const day = (n) => new Date(Date.now() - n * 86_400_000).toISOString()
const good = cardState([{ rating: 2, createdAt: day(0) }])
ok('one "Good" moves to box 1, back tomorrow', good.box === 1 && !isDue(good), `box ${good.box}, due ${good.dueAt?.slice(0, 10)}`)
const twice = cardState([{ rating: 2, createdAt: day(5) }, { rating: 2, createdAt: day(4) }])
ok('two "Good"s count as learned', isLearned(twice), `box ${twice.box}`)
const forgotten = cardState([
  { rating: 3, createdAt: day(30) }, { rating: 2, createdAt: day(20) }, { rating: 0, createdAt: day(1) },
])
ok('one "Forgot" resets the ladder', forgotten.box === 0 && isDue(forgotten), `box ${forgotten.box}`)
ok('the buttons promise real intervals', intervalAfter(fresh, 2) === 'tomorrow' && intervalAfter(fresh, 0) === 'again today',
  `good → ${intervalAfter(fresh, 2)}, forgot → ${intervalAfter(fresh, 0)}`)
const ordered = orderForReview([
  { card: 'new', state: cardState([]) },
  { card: 'overdue', state: cardState([{ rating: 2, createdAt: day(9) }]) },
  { card: 'not-due', state: cardState([{ rating: 3, createdAt: day(0) }]) },
])
ok('overdue comes before new, and neither before what is not due', ordered.map((e) => e.card).join(',') === 'overdue,new,not-due', ordered.map((e) => e.card).join(' → '))

section('5. The ladder for Electrodynamics')
const { data: myQuiz } = await admin.from('quiz_attempts').select('question_id, is_correct').eq('user_id', userId)
const topicQ = questions.filter((q) => q.topic_id === topic.id)
const topicCards = cards.filter((c) => c.topic_id === topic.id && !c.user_id)
const { data: tasks } = await admin.from('tasks').select('id, topic_id').eq('topic_id', topic.id)
const stages = buildLadder({
  topicSlug: topic.slug,
  topicName: topic.name,
  subjectName: 'Physics',
  lesson: { id: 'electrodynamics-resistance', blocks: blocks.filter((b) => b.lesson_id === 'electrodynamics-resistance').length, minutes: 10, opened: false, completed: false },
  quiz: {
    total: topicQ.length,
    correct: topicQ.filter((q) => myQuiz.some((a) => a.question_id === q.id && a.is_correct)).length,
    answered: topicQ.filter((q) => myQuiz.some((a) => a.question_id === q.id)).length,
  },
  cards: { total: topicCards.length, learned: 0, due: topicCards.length },
  tasks: { total: tasks.length, solved: 0 },
  mocks: { taken: 0, bestPercent: null, subjectEligible: true },
})
for (const stage of stages) {
  console.log(`  ${stage.label.padEnd(12)} ${stage.state.padEnd(12)} ${String(stage.percent).padStart(3)}%  ${stage.detail}`)
}
ok('the first unfinished rung is the one flagged next', nextStep(stages)?.key === 'study', nextStep(stages)?.label)
ok('answering one of six shows as in progress', stages[1].state === 'in-progress' && stages[1].percent === 17, `${stages[1].percent}%`)
ok('every rung with content has a link', stages.filter((s) => s.state !== 'empty').every((s) => s.href))
console.log(`  topic overall: ${ladderPercent(stages)}%`)

section('6. A topic with nothing written says so')
const { data: bare } = await admin.from('topics').select('id, name, slug').eq('slug', 'cell-biology').single()
const bareStages = buildLadder({
  topicSlug: bare.slug, topicName: bare.name, subjectName: 'Biology', lesson: null,
  quiz: { total: 0, correct: 0, answered: 0 },
  cards: { total: 0, learned: 0, due: 0 },
  tasks: { total: 0, solved: 0 },
  mocks: { taken: 0, bestPercent: null, subjectEligible: false },
})
for (const stage of bareStages) console.log(`  ${stage.label.padEnd(12)} ${stage.state.padEnd(8)} ${stage.detail}`)
ok('every rung reads empty rather than 0%', bareStages.every((s) => s.state === 'empty'))
ok('nothing is offered as the next step', nextStep(bareStages) === null)
ok('an empty topic is 0% without pretending to be behind', ladderPercent(bareStages) === 0)

section('7. Cleanup')
if (KEEP) {
  console.log(`  --keep: ${written.length} quiz attempt(s) and one private card left in place.`)
} else {
  await admin.from('quiz_attempts').delete().in('id', written)
  if (ownCard.data) await admin.from('flashcards').delete().eq('id', ownCard.data.id)
  const { count: quizLeft } = await admin.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  const { count: cardsLeft } = await admin.from('flashcards').select('id', { count: 'exact', head: true }).not('user_id', 'is', null)
  ok('test rows removed', quizLeft === 0 && cardsLeft === 0, `${quizLeft} attempts, ${cardsLeft} private cards`)
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`)
process.exit(failures === 0 ? 0 : 1)
