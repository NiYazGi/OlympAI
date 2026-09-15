/**
 * The XP rules, after the check step started paying.
 *
 *   node --import ./.tools/register.mjs .tools/live-xp.mjs
 */
const { quizAnswerXp, quizXp, quizXpOnDay, attemptXp, QUIZ_QUESTION_MAX_XP } =
  await import('@/lib/xp')

let failures = 0
const ok = (label, condition, detail = '') => {
  console.log(`${condition ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}
const section = (t) => console.log(`\n${t}\n${'-'.repeat(t.length)}`)

section('1. What a single answer is worth')
ok('first attempt, wrong', quizAnswerXp({ attemptedBefore: false, solvedBefore: false, isCorrect: false }) === 2)
ok('first attempt, right', quizAnswerXp({ attemptedBefore: false, solvedBefore: false, isCorrect: true }) === 6)
ok('right on the second go', quizAnswerXp({ attemptedBefore: true, solvedBefore: false, isCorrect: true }) === 4)
ok('wrong again pays nothing', quizAnswerXp({ attemptedBefore: true, solvedBefore: false, isCorrect: false }) === 0)
ok('re-answering a solved question pays nothing',
  quizAnswerXp({ attemptedBefore: true, solvedBefore: true, isCorrect: true }) === 0)
ok('a question is capped', QUIZ_QUESTION_MAX_XP === 6)

section('2. A history pays the same as the answers did, one at a time')
const day = (n, q, correct) => ({ questionId: q, isCorrect: correct, createdAt: `2026-09-0${n}T10:00:00Z` })
const history = [
  day(1, 'q1', false), day(1, 'q1', true),   // 2 + 4
  day(1, 'q2', true),                        // 6
  day(2, 'q1', true),                        // 0, already solved
  day(2, 'q3', false),                       // 2
]
ok('total matches the rules', quizXp(history) === 14, `${quizXp(history)} XP`)
ok('a full quiz of six, all right first time', quizXp(
  Array.from({ length: 6 }, (_, i) => day(1, `x${i}`, true))) === 36)

section('3. Which day the XP lands on')
ok('day one', quizXpOnDay(history, '2026-09-01') === 12, `${quizXpOnDay(history, '2026-09-01')} XP`)
ok('day two', quizXpOnDay(history, '2026-09-02') === 2, `${quizXpOnDay(history, '2026-09-02')} XP`)
ok('the days add up to the total',
  quizXpOnDay(history, '2026-09-01') + quizXpOnDay(history, '2026-09-02') === quizXp(history))

section('4. The task rules are untouched')
const attempt = { taskId: 't', difficulty: 5, isCorrect: false, score: 0, createdAt: '' }
ok('a non-attempt still earns nothing', attemptXp(attempt, false) === 0)
ok('a first solve still pays full rate',
  attemptXp({ ...attempt, isCorrect: true, score: 95 }, false) === 60)
ok('a quiz is worth far less than a problem',
  quizXp(Array.from({ length: 6 }, (_, i) => day(1, `y${i}`, true))) <
    attemptXp({ ...attempt, isCorrect: true, score: 95 }, false),
  '36 XP for six questions against 60 for a five-star solve')

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`)
process.exit(failures === 0 ? 0 : 1)
