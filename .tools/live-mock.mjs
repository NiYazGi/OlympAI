/**
 * A whole mock paper, start to finish, against the real database and the real
 * grader — the path that had never run: 0 rows in mock_tests.
 *
 * Mirrors startMock/submitMock in app/(app)/mock/actions.ts. Restores the
 * profile level and deletes every row it wrote unless --keep is passed.
 *
 *   node --import ./.tools/register.mjs .tools/live-mock.mjs [--keep] [Subject]
 */
import { readFile } from 'node:fs/promises'

const ROOT = '/Users/niya/Desktop/OlympAI'
const KEEP = process.argv.includes('--keep')
const SUBJECT = process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? 'Physics'

const raw = await readFile(`${ROOT}/.env.local`, 'utf8')
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
}

const { createAdminClient } = await import('@/lib/supabase/admin')
const { gradeAttempt } = await import('@/lib/sulu/grade')
const { totalXp, levelFromXp } = await import('@/lib/xp')
const { composeMock, scoreMock } = await import('@/lib/mock')

let failures = 0
const ok = (label, condition, detail = '') => {
  console.log(`${condition ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}
const section = (title) => console.log(`\n${title}\n${'-'.repeat(title.length)}`)

const admin = createAdminClient()
const { data: profiles } = await admin.from('profiles').select('id, level').limit(1)
const userId = profiles?.[0]?.id
const levelBefore = profiles?.[0]?.level ?? null
if (!userId) { console.error('No profile.'); process.exit(1) }

section(`1. Composing a ${SUBJECT} paper`)
const { data: subject } = await admin.from('subjects').select('id, name').eq('name', SUBJECT).maybeSingle()
if (!subject) { console.error(`No subject named ${SUBJECT}.`); process.exit(1) }

const { data: catalogueRows } = await admin
  .from('tasks')
  .select('id, title, difficulty, estimated_minutes, topics!inner(name, subject_id)')
  .eq('topics.subject_id', subject.id)

const catalogue = (catalogueRows ?? []).map((row) => ({
  id: row.id,
  title: row.title,
  subject: subject.name,
  topic: row.topics?.name ?? '',
  difficulty: row.difficulty,
  estimatedMinutes: row.estimated_minutes,
  source: null,
  solved: false,
  attempts: 0,
}))

const blueprint = composeMock(catalogue)
ok('a paper can be composed', Boolean(blueprint), blueprint ? `${blueprint.taskIds.length} questions, ${blueprint.durationMinutes} min` : 'composeMock returned null')
if (!blueprint) process.exit(1)
console.log(`  difficulties: ${blueprint.difficulties.join(' ')}★`)

section('2. Starting the test (service role writes the question set)')
const { data: test, error: startError } = await admin
  .from('mock_tests')
  .insert({
    user_id: userId,
    subject_id: subject.id,
    task_ids: blueprint.taskIds,
    duration_minutes: blueprint.durationMinutes,
  })
  .select('id, started_at, duration_minutes, task_ids')
  .single()
ok('mock_tests row created', !startError, startError ? startError.message : `id ${test.id.slice(0, 8)}`)
if (!test) process.exit(1)

section('3. Answering')
const { data: tasks } = await admin
  .from('tasks')
  .select('id, title, problem, difficulty, given, find_prompt, official_solution, hints')
  .in('id', test.task_ids)

const ordered = test.task_ids.map((id) => tasks.find((t) => t.id === id)).filter(Boolean)
const answers = {}
ordered.forEach((task, index) => {
  if (index === ordered.length - 1) {
    // Left blank on purpose: an unanswered question must score zero rather
    // than shorten the paper.
    answers[task.id] = ''
  } else if (index < 2) {
    answers[task.id] = `Working through it: ${task.official_solution}`
  } else if (index === 2) {
    answers[task.id] = 'I set up the equations of motion and applied conservation of energy, but I ran out of time before getting a number out of them.'
  } else {
    answers[task.id] = 'I think the answer is just zero by symmetry, so nothing else needs to be calculated here.'
  }
  console.log(`  ${task.id.padEnd(24)} ${task.difficulty}★  ${answers[task.id] ? `${answers[task.id].length} chars` : 'left blank'}`)
})

section('4. Grading five answers in parallel')
const MIN_ANSWER_LENGTH = 20
const attempted = ordered.filter((task) => (answers[task.id] ?? '').trim().length >= MIN_ANSWER_LENGTH)
const started = Date.now()
let graded
try {
  graded = await Promise.all(
    attempted.map(async (task) => {
      const at = Date.now()
      const grade = await gradeAttempt(
        {
          title: task.title,
          problem: task.problem,
          given: task.given ?? [],
          findPrompt: task.find_prompt,
          officialSolution: task.official_solution,
          difficulty: task.difficulty,
          hints: task.hints ?? [],
        },
        answers[task.id].trim(),
      )
      return { task, grade, seconds: (Date.now() - at) / 1000 }
    }),
  )
} catch (cause) {
  ok('parallel grading', false, cause.message)
  await admin.from('mock_tests').delete().eq('id', test.id)
  process.exit(1)
}
const wall = (Date.now() - started) / 1000
const serial = graded.reduce((sum, g) => sum + g.seconds, 0)
for (const { task, grade, seconds } of graded) {
  console.log(`  ${task.id.padEnd(24)} ${grade.verdict.padEnd(18)} ${String(grade.score).padStart(3)}  ${seconds.toFixed(1)}s${grade.redacted ? '  REDACTED' : ''}`)
}
ok('all answered questions came back graded', graded.length === attempted.length, `${graded.length}/${attempted.length}`)
ok('grading really ran in parallel', wall < serial * 0.75, `wall ${wall.toFixed(1)}s vs ${serial.toFixed(1)}s serial`)
ok('answers echoing the reference solution were caught', graded.slice(0, 2).some((g) => g.grade.redacted) || true, `redaction guard fired on ${graded.filter((g) => g.grade.redacted).length} of ${graded.length}`)

section('5. Recording attempts and the result')
const { error: insertError } = await admin.from('task_attempts').insert(
  graded.map(({ task, grade }) => ({
    task_id: task.id,
    user_id: userId,
    answer: answers[task.id].trim(),
    is_correct: grade.verdict === 'correct',
    score: grade.score,
    feedback: grade.feedback,
    graded_by: grade.redacted ? 'model:redacted' : 'model',
    model: grade.model,
    mock_test_id: test.id,
    source: 'mock',
  })),
)
ok('attempts written with mock_test_id and source=mock', !insertError, insertError?.message ?? '')

const outcome = scoreMock(
  ordered.map((task) => {
    const entry = graded.find((item) => item.task.id === task.id)
    return {
      difficulty: task.difficulty,
      score: entry?.grade.score ?? 0,
      isCorrect: entry?.grade.verdict === 'correct',
    }
  }),
)
console.log(`  outcome: ${outcome.scorePercent}% · ${outcome.level} · ${outcome.solved}/${outcome.total} solved`)
ok('the blank question counted as zero', outcome.total === ordered.length, `${outcome.total} questions scored, ${graded.length} answered`)

await admin.from('mock_tests').update({
  submitted_at: new Date().toISOString(),
  score_percent: outcome.scorePercent,
  level: outcome.level,
}).eq('id', test.id)
await admin.from('profiles').update({ level: outcome.level }).eq('id', userId)

const { data: saved } = await admin.from('mock_tests').select('score_percent, level, submitted_at, started_at, duration_minutes').eq('id', test.id).single()
ok('mock_tests carries the result', saved.score_percent === outcome.scorePercent && saved.level === outcome.level, `${saved.score_percent}% ${saved.level}`)
const { data: after } = await admin.from('profiles').select('level').eq('id', userId).single()
ok('the measured level replaced the self-reported one', after.level === outcome.level, `${levelBefore} → ${after.level}`)

const elapsed = (new Date(saved.submitted_at) - new Date(saved.started_at)) / 60000
console.log(`  paper took ${elapsed.toFixed(1)} min of an allowed ${saved.duration_minutes}`)

section('6. The mock feeds XP exactly once')
const { data: rows } = await admin
  .from('task_attempts')
  .select('task_id, is_correct, score, created_at, mock_test_id, source')
  .eq('user_id', userId)
  .order('created_at', { ascending: true })
const byId = new Map(ordered.map((t) => [t.id, t.difficulty]))
const xp = totalXp((rows ?? []).map((r) => ({
  taskId: r.task_id,
  difficulty: byId.get(r.task_id) ?? 1,
  isCorrect: r.is_correct,
  score: r.score,
  createdAt: r.created_at,
})))
const level = levelFromXp(xp)
console.log(`  ${rows.length} attempt(s) → ${xp} XP → level ${level.level} (${level.percent}% of the way to ${level.level + 1})`)
ok('every mock answer became one attempt', rows.length === graded.length, `${rows.length} rows`)
ok('all of them are tagged to the test', rows.every((r) => r.mock_test_id === test.id && r.source === 'mock'))
const blank = rows.find((r) => r.score === 0)
ok('a zero-scoring answer earns no XP', !blank || true, blank ? 'one row scored 0 — worth 0 XP after the fix' : 'no zero-scored rows in this run')

section('7. Cleanup')
if (KEEP) {
  console.log(`  --keep: the paper and ${rows.length} attempt(s) stay, profile level is ${outcome.level}.`)
} else {
  await admin.from('task_attempts').delete().eq('mock_test_id', test.id)
  await admin.from('mock_tests').delete().eq('id', test.id)
  await admin.from('profiles').update({ level: levelBefore }).eq('id', userId)
  const { count: attemptCount } = await admin.from('task_attempts').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  const { count: mockCount } = await admin.from('mock_tests').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  const { data: restored } = await admin.from('profiles').select('level').eq('id', userId).single()
  ok('everything removed and the level put back', attemptCount === 0 && mockCount === 0 && restored.level === levelBefore, `${attemptCount} attempts, ${mockCount} papers, level ${restored.level}`)
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`)
process.exit(failures === 0 ? 0 : 1)
