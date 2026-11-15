import assert from 'node:assert/strict'
import { diagnosticQuestions, scoreDiagnostic } from '@/lib/diagnostic'
import { diagnosticSupport } from '@/lib/diagnostic-support'

for (const subject of ['Mathematics', 'Physics', 'Informatics']) {
  const bank = diagnosticQuestions(subject)
  const answers = Object.fromEntries(bank.map((item) => [item.id, { choice: item.dimension === 'presentation' ? -1 : item.correct, hintUsed: false }]))
  const result = scoreDiagnostic(subject, answers, { assistance: 'alone', note: '' })
  const before = JSON.stringify(result)
  const support = diagnosticSupport(result, subject)
  assert.deepEqual(support.map((item) => item.id), ['presentation'], 'Weak proof/presentation changes the review even when methods are correct')
  assert.equal(result.dimensions.knowledge.score, 100)
  assert.equal(result.dimensions.methods.score, 100)
  assert.equal(result.dimensions.presentation.score, 0)
  assert.equal(JSON.stringify(result), before, 'Review support cannot overwrite measured skills or scores')
  const unaided = scoreDiagnostic(subject, Object.fromEntries(bank.map((item) => [item.id, { choice: item.correct, hintUsed: false }])), { assistance: 'alone', note: '' })
  assert.deepEqual(diagnosticSupport(unaided, subject), [])
  assert.deepEqual(diagnosticSupport({ ...unaided, selfReport: { assistance: 'guided', note: '' } }, subject).map((item) => item.id), ['independence'])
  assert.deepEqual(diagnosticSupport({ ...unaided, selfReport: null }, subject), [], 'No diagnostic means no invented weakness')
  assert.equal(unaided.dimensions.independence.score, null)
}
console.log('PASS: presentation/self-reliance signals change review support without changing scores, hours or unrelated knowledge.')
