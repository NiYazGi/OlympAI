// node --import ./.tools/register.mjs .tools/diagnostic-skills.mjs
import assert from 'node:assert/strict'
import katex from 'katex'
import { diagnosticQuestions, publicDiagnosticQuestions, scoreDiagnostic, DIAGNOSTIC_MINUTES } from '@/lib/diagnostic'
import { taskSkills, skillIdsForTask, SKILLS, EDITORIAL_TASK_SKILLS } from '@/lib/skill-catalogue'

assert.equal(DIAGNOSTIC_MINUTES, 12)
const skillIds = new Set(SKILLS.map((skill) => skill.id))
assert.equal(skillIds.size, SKILLS.length, 'Skill identifiers are unique')
for (const subject of ['Mathematics', 'Physics', 'Informatics']) {
  const bank = diagnosticQuestions(subject)
  const publicBank = publicDiagnosticQuestions(subject)
  assert.ok(bank.length >= 8)
  assert.deepEqual(new Set(bank.map((item) => item.dimension)), new Set(['knowledge', 'methods', 'presentation']))
  assert.equal(new Set(bank.map((item) => item.id)).size, bank.length)
  for (const row of publicBank) {
    assert.deepEqual(Object.keys(row).sort(), ['dimension', 'id', 'options', 'prompt', 'skillIds'])
    assert.ok(!('correct' in row) && !('hint' in row) && !('explanation' in row), 'No answer keys or hints before submission')
  }
  const answers = Object.fromEntries(bank.map((item) => [item.id, { choice: item.correct, hintUsed: false }]))
  const correct = scoreDiagnostic(subject, answers, { assistance: 'alone', note: '' })
  assert.equal(correct.dimensions.knowledge.score, 100)
  assert.equal(correct.dimensions.methods.score, 100)
  assert.equal(correct.dimensions.presentation.score, 100)
  assert.equal(correct.dimensions.independence.score, null, 'Self-report is not an objective percentage')
  assert.equal(correct.dimensions.independence.basis, 'self-report')
  assert.ok(correct.strongSkillIds.length >= 3)
  assert.equal(correct.weakSkillIds.length, 0)
  assert.ok(correct.strongSkillIds.every((id) => correct.skillChecks[id].total >= 2))
  const guided = scoreDiagnostic(subject, answers, { assistance: 'guided', note: 'С преподавателем' })
  assert.equal(guided.strongSkillIds.length, 0, 'Guided answers do not confirm independent skill strength')
  const hintedAnswers = Object.fromEntries(bank.map((item) => [item.id, { choice: item.correct, hintUsed: true }]))
  const hinted = scoreDiagnostic(subject, hintedAnswers, { assistance: 'alone', note: '' })
  assert.equal(hinted.observedHints, bank.length)
  assert.equal(hinted.strongSkillIds.length, 0, 'Hints do not turn into unaided confidence')
  const unknown = scoreDiagnostic(subject, Object.fromEntries(bank.map((item) => [item.id, { choice: -1, hintUsed: false }])), { assistance: 'alone', note: '' })
  assert.equal(unknown.dimensions.knowledge.score, 0)
  assert.ok(unknown.weakSkillIds.length >= 3)
  assert.equal(unknown.strongSkillIds.length, 0)
  for (const item of bank) {
    assert.ok(item.correct >= 0 && item.correct < item.options.length)
    assert.ok(item.skillIds.every((id) => skillIds.has(id)), 'Every item links only known skills')
    for (const text of [item.prompt, ...item.options, item.explanation, item.hint]) {
      for (const formula of text.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)) {
        katex.renderToString(formula[1] ?? formula[2], { throwOnError: true, strict: 'error' })
      }
    }
  }
}
const physicsBank = diagnosticQuestions('Physics')
const onlyFrictionWrong = Object.fromEntries(physicsBank.map((item) => [item.id, { choice: item.skillIds.includes('static-friction') ? -1 : item.correct, hintUsed: false }]))
const targeted = scoreDiagnostic('Physics', onlyFrictionWrong, { assistance: 'alone', note: '' })
assert.deepEqual(targeted.weakSkillIds, ['static-friction'], 'A specific deficit does not spread to unrelated methods')
assert.equal(targeted.skillScores['momentum-system'], 100)
assert.ok(targeted.evidence.filter((item) => item.skillIds.includes('static-friction')).every((item) => !item.correct))

assert.ok(Object.keys(EDITORIAL_TASK_SKILLS).length > 10)
const staticLink = taskSkills({ id: 'phys-national-2013-9-t1-1', subject: 'Physics', problem: '...' })
assert.ok(staticLink.some((skill) => skill.id === 'static-friction' && skill.provenance === 'editorial'))
const candidate = taskSkills({ id: 'new-physics-problem', subject: 'Physics', problem: 'Известен коэффициент трения покоя.' })
assert.ok(candidate.some((skill) => skill.id === 'static-friction' && skill.confidence === 'suggested'))
assert.deepEqual(skillIdsForTask({ id: 'new-physics-problem', subject: 'Physics', problem: 'Известен коэффициент трения покоя.' }, { verifiedOnly: true }), [], 'Inference never creates confirmed evidence')
assert.deepEqual(taskSkills({ id: 'phys-national-2013-9-t1-1', subject: 'Mathematics', problem: '' }), [], 'A physical link cannot contaminate mathematics')
assert.deepEqual(taskSkills({ id: '__proto__', subject: 'Physics' }), [])
assert.deepEqual(taskSkills({ id: 'constructor', subject: 'Physics' }), [])
console.log('PASS: four diagnostic axes, three subjects, private answer keys, exact skill evidence, hint/self-report confidence, formula validity, and non-authoritative candidate tags.')

for (const problem of ['ВАХ', 'Построй ВАХ цепи.', 'Построй вах.', 'График (ВАХ) лампы']) {
  assert.ok(taskSkills({ id: 'candidate-iv', subject: 'Physics', problem }).some((skill) => skill.id === 'iv-characteristic' && skill.confidence === 'suggested'))
}
assert.ok(!taskSkills({ id: 'candidate-iv', subject: 'Physics', problem: 'АВАХБ ВАХ123' }).some((skill) => skill.id === 'iv-characteristic'), 'Cyrillic acronym must be a separate word')
