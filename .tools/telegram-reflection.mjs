// node --import ./.tools/register.mjs .tools/telegram-reflection.mjs
// Pure checks only: no database opening or Telegram calls.
import assert from 'node:assert/strict'
import { parseReflectionScore, reflectionSummary, REFLECTION_AXES } from '@/lib/telegram-reflection'
import { trainingToday } from '@/lib/training-time'
for (let score = 0; score <= 5; score++) assert.equal(parseReflectionScore(String(score)), score)
for (const invalid of ['6', '-1', '2.5', '15', '2 часа', '', 'NaN', null, 4, '1e0']) assert.equal(parseReflectionScore(invalid), null)
assert.equal(parseReflectionScore(' 3 '), 3)
assert.equal(REFLECTION_AXES.length, 5)
const scores = { load_score: 5, solving_score: 5, theory_score: 5, mental_score: 0, sleep_score: 0 }
const report = reflectionSummary(scores, '2026-11-13')
assert.ok(report.includes('15/25'))
for (const axis of REFLECTION_AXES) assert.ok(report.includes(`${axis.label}: ${scores[axis.key]}/5`))
assert.ok(report.includes('не порог успеха'))
assert.ok(report.includes('ещё не утверждены'))
assert.ok(!report.includes('День засчитан'))
assert.equal(trainingToday(new Date('2026-11-12T19:30:00.000Z')), '2026-11-13')
console.log('PASS: optional Telegram strict0–5 parsing, five independent axes, no arbitrary pass threshold, Almaty date. No messages sent.')
