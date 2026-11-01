/**
 * Whether the grader's margin marks land on the lines they are about.
 *
 * A protocol is only worth its margin if a mark sits where the trouble is. This
 * takes stored reference solutions, breaks one line in each on purpose — a
 * number changed, or a step replaced by "obviously, it follows" — and checks
 * that the first gap or error the grader marks is that line or the next one,
 * which is where a broken step usually surfaces. A few references are graded
 * untouched as well, to see that a complete solution is not marked as broken.
 *
 * Runs the real grader against the real model. Nothing is written to the
 * database; the protocols are saved to the file given as --out, if any.
 *
 *   node --import ./.tools/register.mjs .tools/live-protocol.mjs [--out file.json]
 */
import { readFile, writeFile } from 'node:fs/promises'

const ROOT = '/Users/niya/Desktop/OlympAI'
const BROKEN = 15
const UNTOUCHED = 5
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null

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
const { solutionLines } = await import('@/lib/protocol')

const admin = createAdminClient()
const { data: tasks, error } = await admin
  .from('tasks')
  .select('id, title, problem, difficulty, given, find_prompt, official_solution, hints, diagram_url')
  .not('official_solution', 'is', null)
  .limit(400)
if (error) throw error

// References long enough to break one line in the middle of, in a fixed order
// that is not the catalogue's, so a run is repeatable and spans the subjects.
// Textbook solutions that carry the book's furniture — "Q&A", "Try It",
// "Figure 3" — are left out: graded as an attempt, the grader rightly calls
// them copied text, and the run measures that instead of the margin.
const order = (id) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
const pool = tasks
  .filter((task) => solutionLines(task.official_solution).length >= 5)
  .filter((task) => !/Q&A|Try It|Analysis|Figure \d|Table \d/.test(task.official_solution))
  .sort((a, b) => order(a.id) - order(b.id))
  .slice(0, BROKEN + UNTOUCHED)

if (pool.length < BROKEN + UNTOUCHED) {
  console.log(`only ${pool.length} references are long enough; running on those`)
}

/**
 * Breaks one line near the middle of a reference, and only a line the argument
 * leans on: a value computed after "=" is changed, which the next lines cannot
 * recover from; failing that, a step with an "=" in it is replaced by an
 * unproved claim, which is a gap. The first run changed whatever number came
 * first — "Table 6", the equation label "(9)" — and counted the grader's
 * silence about them as misses.
 */
function breakLine(lines, ru) {
  const middle = Math.max(2, Math.floor(lines.length / 2))
  const nearest = (candidates) =>
    candidates.reduce((best, c) => (Math.abs(c.line - middle) < Math.abs(best.line - middle) ? c : best))
  const inner = lines.map((text, i) => ({ line: i + 1, text })).filter((c) => c.line >= 2 && c.line < lines.length)

  const computed = inner
    .map((c) => ({ ...c, match: c.text.match(/=\s*(-?\d+(?:[.,]\d+)?)/) }))
    .filter((c) => c.match)
  if (computed.length) {
    const pick = nearest(computed)
    const value = Number(pick.match[1].replace(',', '.'))
    const wrong = Number.isInteger(value) ? String(value + 3) : (value * 2).toFixed(2)
    const at = pick.match.index
    const text = pick.text.slice(0, at) + pick.match[0].replace(pick.match[1], wrong) + pick.text.slice(at + pick.match[0].length)
    return { line: pick.line, kind: 'number', text }
  }

  const steps = inner.filter((c) => c.text.includes('='))
  const pick = steps.length ? nearest(steps) : { line: middle }
  return {
    line: pick.line,
    kind: 'jump',
    text: ru ? 'Отсюда очевидно следует нужное утверждение.' : 'Hence the claim obviously follows.',
  }
}

// The interface language the student would have: Russian for a Russian
// statement, English otherwise, as the app passes it from the locale.
const languageOf = (task) => (/[а-яё]/i.test(task.problem) ? 'ru' : 'en')

const context = (task) => ({
  title: task.title,
  problem: task.problem,
  given: task.given ?? [],
  findPrompt: task.find_prompt,
  officialSolution: task.official_solution,
  difficulty: task.difficulty,
  hints: task.hints ?? [],
  diagramUrl: task.diagram_url,
  language: languageOf(task),
})

const cases = pool.map((task, index) => {
  const lines = solutionLines(task.official_solution)
  if (index >= BROKEN) return { task, answer: lines.join('\n'), broken: null }
  const change = breakLine(lines, languageOf(task) === 'ru')
  const answer = lines.map((line, i) => (i === change.line - 1 ? change.text : line)).join('\n')
  return { task, answer, broken: { line: change.line, kind: change.kind } }
})

async function grade(item) {
  const started = Date.now()
  try {
    const result = await gradeAttempt(context(item.task), item.answer)
    return { ...item, result, seconds: Math.round((Date.now() - started) / 1000) }
  } catch (cause) {
    return { ...item, failure: String(cause?.message ?? cause) }
  }
}

// Four at a time: the provider is fine with it and twenty in a row is slow.
const results = []
for (let i = 0; i < cases.length; i += 4) {
  results.push(...(await Promise.all(cases.slice(i, i + 4).map(grade))))
}

let hits = 0
let brokenGraded = 0
let falseAlarms = 0
let wrongLanguage = 0
for (const item of results) {
  const id = item.task.id.padEnd(28).slice(0, 28)
  if (item.failure) {
    console.log(`FAIL  ${id}  grader error: ${item.failure}`)
    continue
  }
  const { result } = item
  const firstTrouble = result.marks.find((mark) => mark.kind === 'gap' || mark.kind === 'error')
  const lines = solutionLines(item.answer).length
  const covered = result.marks.reduce((sum, mark) => sum + (mark.to - mark.from + 1), 0)
  const said = /[а-яё]/i.test(result.summary) ? 'ru' : 'en'
  if (said !== languageOf(item.task)) wrongLanguage++
  const shape = `${result.verdict.padEnd(17)} ${result.points}/7  marks cover ${covered}/${lines}  criteria ${result.criteria.length}  ${said === languageOf(item.task) ? said : `${said}, wanted ${languageOf(item.task)}`}  ${item.seconds}s`

  if (item.broken) {
    brokenGraded++
    const k = item.broken.line
    const where = result.breakPoint?.line ?? firstTrouble?.from ?? null
    const onTarget =
      (firstTrouble && firstTrouble.from <= k + 1 && firstTrouble.to >= k) ||
      (result.breakPoint && (result.breakPoint.line === k || result.breakPoint.line === k + 1))
    if (onTarget) hits++
    console.log(
      `${onTarget ? 'hit ' : 'MISS'}  ${id}  broke line ${k} (${item.broken.kind}), grader points at ${where ?? 'nothing'}  ${shape}`,
    )
  } else {
    const alarm = result.marks.some((mark) => mark.kind === 'error')
    if (alarm) falseAlarms++
    console.log(`${alarm ? 'ALARM' : 'clean'} ${id}  untouched reference  ${shape}`)
  }
}

console.log(
  `\n${hits}/${brokenGraded} broken lines found by the margin; ${falseAlarms}/${results.length - brokenGraded} untouched references marked with an error; ${wrongLanguage} protocols in the wrong language`,
)

if (out) {
  await writeFile(
    out,
    JSON.stringify(
      results.map(({ task, answer, broken, result, failure }) => ({
        taskId: task.id,
        title: task.title,
        problem: task.problem,
        answer,
        broken,
        result: result ?? null,
        failure: failure ?? null,
      })),
      null,
      2,
    ),
  )
  console.log(`protocols written to ${out}`)
}
