/**
 * End-to-end check of the submit → grade → record → XP chain, headless.
 *
 * Runs the real grader against the real model and writes real rows with the
 * service role, exactly as app/(app)/tasks/actions.ts does. What it does NOT
 * cover: the session check, the rate limiter and revalidatePath — those need a
 * request, and get walked in the browser instead.
 *
 *   node --import ./.tools/register.mjs .tools/live-check.mjs [--keep]
 */
import { readFile } from 'node:fs/promises'

const ROOT = '/Users/niya/Desktop/OlympAI'
const KEEP = process.argv.includes('--keep')

const raw = await readFile(`${ROOT}/.env.local`, 'utf8')
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
}

// After the env, or the modules that read it at scope capture nothing.
const { createAdminClient } = await import('@/lib/supabase/admin')
const { gradeAttempt } = await import('@/lib/sulu/grade')
const { attemptXp, totalXp, levelFromXp, xpForFirstSolve } = await import('@/lib/xp')
const { composeMock, scoreMock } = await import('@/lib/mock')

let failures = 0
const ok = (label, condition, detail = '') => {
  console.log(`${condition ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}
const section = (title) => console.log(`\n${title}\n${'-'.repeat(title.length)}`)

const admin = createAdminClient()

const { data: profiles } = await admin.from('profiles').select('id').limit(1)
const userId = profiles?.[0]?.id
if (!userId) { console.error('No profile to attribute attempts to.'); process.exit(1) }

const TASK_ID = 'two-masses-pulley'
const { data: task, error: taskError } = await admin
  .from('tasks')
  .select('id, title, problem, difficulty, given, find_prompt, official_solution, hints')
  .eq('id', TASK_ID)
  .maybeSingle()
if (taskError || !task) { console.error('Task not found:', taskError); process.exit(1) }

const context = {
  title: task.title,
  problem: task.problem,
  given: task.given ?? [],
  findPrompt: task.find_prompt,
  officialSolution: task.official_solution,
  difficulty: task.difficulty,
  hints: task.hints ?? [],
}

const BANDS = {
  correct: [85, 100],
  partially_correct: [40, 84],
  incorrect: [5, 39],
  not_an_attempt: [0, 0],
}

const ANSWERS = [
  {
    label: 'a full correct derivation',
    expect: 'correct',
    text: `Free-body diagrams. For m1 (going down): m1*g - T = m1*a. For m2 (going up): T - m2*g = m2*a.
The string is inextensible so both share |a|. Adding the two equations eliminates T:
(m1 - m2)*g = (m1 + m2)*a, so a = (m1 - m2)*g/(m1 + m2) = (3.0 - 2.0)*9.8/5.0 = 1.96 m/s^2.
Back-substituting into the second equation: T = m2*(g + a) = 2.0*(9.8 + 1.96) = 23.5 N.
Equivalently T = 2*m1*m2*g/(m1 + m2) = 2*3.0*2.0*9.8/5.0 = 23.5 N.`,
  },
  {
    label: 'right method, arithmetic slip on T',
    expect: 'partially_correct',
    text: `Set up Newton's second law for each mass along the direction of motion:
m1*g - T = m1*a and T - m2*g = m2*a. Adding them gives a = (m1 - m2)g/(m1 + m2),
so a = 1.0*9.8/5.0 = 1.96 m/s^2, which is right.
For the tension I used T = m1*(g + a) = 3.0*(9.8 + 1.96) = 35.3 N.`,
  },
  {
    label: 'a confident but wrong answer',
    expect: 'incorrect',
    text: `Since m1 is heavier it just falls freely, so the acceleration is a = g = 9.8 m/s^2
and the tension is simply the weight of the lighter mass, T = m2*g = 19.6 N.`,
  },
  {
    label: 'not an attempt',
    expect: 'not_an_attempt',
    text: 'I have no idea how to start this one, please just tell me the answer.',
  },
]

section(`1. Grader — ${task.title} (${task.difficulty}★)`)
const grades = []
for (const item of ANSWERS) {
  const started = Date.now()
  let grade
  try {
    grade = await gradeAttempt(context, item.text)
  } catch (cause) {
    ok(item.label, false, `grader threw: ${cause.message}`)
    continue
  }
  const [low, high] = BANDS[grade.verdict]
  const inBand = grade.score >= low && grade.score <= high
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  ok(
    item.label,
    grade.verdict === item.expect && inBand,
    `verdict=${grade.verdict} score=${grade.score} ${seconds}s${grade.redacted ? ' REDACTED' : ''}${grade.verdict !== item.expect ? ` (expected ${item.expect})` : ''}`,
  )
  console.log(`        feedback: ${grade.feedback.slice(0, 150)}${grade.feedback.length > 150 ? '…' : ''}`)
  if (grade.nextHint) console.log(`        hint: ${grade.nextHint.slice(0, 120)}`)
  const leak = task.official_solution && grade.feedback.includes('23.5') && item.expect === 'not_an_attempt'
  if (leak) ok('  answer not leaked to a non-attempt', false, 'feedback contains the final number')
  grades.push({ item, grade })
}

section('2. Writing attempts with the service role')
const inserted = []
for (const { item, grade } of grades) {
  const { data, error } = await admin
    .from('task_attempts')
    .insert({
      task_id: task.id,
      user_id: userId,
      answer: item.text,
      is_correct: grade.verdict === 'correct',
      score: grade.score,
      feedback: grade.feedback,
      graded_by: grade.redacted ? 'model:redacted' : 'model',
      model: grade.model,
    })
    .select('id, created_at, is_correct, score')
    .single()
  ok(`insert (${item.label})`, !error, error ? error.message : `row ${data.id.slice(0, 8)}`)
  if (data) inserted.push(data)
}

section('3. XP derived from the rows just written')
const { data: rows } = await admin
  .from('task_attempts')
  .select('task_id, is_correct, score, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: true })

const attempts = (rows ?? []).map((row) => ({
  taskId: row.task_id,
  difficulty: task.difficulty,
  isCorrect: row.is_correct,
  score: row.score,
  createdAt: row.created_at,
}))

const xp = totalXp(attempts)
const level = levelFromXp(xp)
console.log(`  attempts=${attempts.length}  xp=${xp}  level=${level.level} (${level.into}/${level.span}, ${level.percent}%)`)
ok('first solve pays full rate', attemptXp(attempts.find((a) => a.isCorrect) ?? attempts[0], false) === xpForFirstSolve(task.difficulty))
const repeat = attemptXp({ ...attempts[0], isCorrect: true, score: 95 }, true)
const first = attemptXp({ ...attempts[0], isCorrect: true, score: 95 }, false)
ok('a repeat solve is worth a tenth', repeat === Math.round(first * 0.1), `${first} → ${repeat}`)
ok('level is at least 1', level.level >= 1)

section('4. Mock papers — can each subject even produce one?')
const { data: catalogue } = await admin
  .from('tasks')
  .select('id, difficulty, estimated_minutes, topics(name, subjects(name))')
const bySubject = new Map()
for (const row of catalogue ?? []) {
  const subject = row.topics?.subjects?.name ?? 'unknown'
  if (!bySubject.has(subject)) bySubject.set(subject, [])
  bySubject.get(subject).push({
    id: row.id,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    solved: false,
    title: '',
    subject,
    topic: '',
    attempts: 0,
  })
}
for (const [subject, tasks] of [...bySubject].sort()) {
  const blueprint = composeMock(tasks)
  console.log(
    `  ${subject.padEnd(18)} ${String(tasks.length).padStart(2)} tasks → ${
      blueprint
        ? `paper of ${blueprint.taskIds.length} (${blueprint.difficulties.join('')}★), ${blueprint.durationMinutes} min`
        : 'NO PAPER (needs 3+)'
    }`,
  )
}

section('5. Scoring a paper from the real grades')
const outcome = scoreMock(
  grades.map(({ grade }) => ({
    difficulty: task.difficulty,
    score: grade.score,
    isCorrect: grade.verdict === 'correct',
  })),
)
console.log(`  ${outcome.scorePercent}% → ${outcome.level}: ${outcome.headline}`)
ok('score is a percentage', outcome.scorePercent >= 0 && outcome.scorePercent <= 100)
ok('solved count matches the verdicts', outcome.solved === grades.filter((g) => g.grade.verdict === 'correct').length)

section('6. Cleanup')
if (KEEP) {
  console.log(`  --keep: leaving ${inserted.length} attempt(s) in place.`)
} else {
  const { error } = await admin
    .from('task_attempts')
    .delete()
    .in('id', inserted.map((row) => row.id))
  const { count } = await admin
    .from('task_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  ok('test rows removed', !error && count === 0, `${count} attempt(s) left for this user`)
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`)
process.exit(failures === 0 ? 0 : 1)
