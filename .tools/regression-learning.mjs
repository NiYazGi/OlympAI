// node --import ./.tools/register.mjs .tools/regression-learning.mjs
import assert from 'node:assert/strict'
import katex from 'katex'
import { buildLadder, ladderPercent, nextStep } from '@/lib/ladder'
import { buildTopicMetrics } from '@/lib/topic-progress'
import { methodsForTask, TASK_METHODS } from '@/lib/task-methods'
import { nextAction } from '@/lib/next-action'

const empty = {
  topicSlug: 'kinematics', topicName: 'Kinematics', subjectName: 'Physics', lesson: null,
  quiz: { total: 0, correct: 0, answered: 0 },
  cards: { total: 0, learned: 0, due: 0, fresh: 0 },
  tasks: { total: 0, solved: 0 },
  mocks: { taken: 0, bestPercent: null, subjectEligible: true },
}
const bridge = 'phys-national-2025-9-t1-3'
const helicopter = 'phys-oblast-2011-10-t1-2'
const attempt = { id: 'attempt-bridge', task_id: bridge, is_correct: false, score: 57, created_at: '2026-11-11T10:00:00.000Z', mock_test_id: 'paper-physics' }
const paper = { id: 'paper-physics', task_ids: [bridge], score_percent: 57, submitted_at: attempt.created_at }
const before = buildLadder(empty)
const after = buildLadder({ ...empty, mocks: { taken: 1, bestPercent: 57, subjectEligible: true } })
assert.deepEqual(after, before, 'A subject paper must not change any topic action')
assert.equal(ladderPercent(after), 0)
assert.equal(nextStep(after), null)
assert.ok(after.every((stage) => stage.state === 'empty'))
const kinematics = buildTopicMetrics({ topicSlug: 'kinematics', taskIds: [], stages: after, attempts: [attempt], papers: [paper] })
assert.equal(kinematics.coverage.ready, false)
assert.equal(kinematics.route.completed, 0)
assert.deepEqual(kinematics.attempts, [])
assert.deepEqual(kinematics.skills, [])
assert.deepEqual(kinematics.papers, [])
assert.equal(nextAction('Physics', [{ ...empty, slug: empty.topicSlug, name: empty.topicName, input: empty, stages: after, percent: 0 }]).kind, 'empty-subject')

const electricalInput = { ...empty, topicSlug: 'electrodynamics', topicName: 'Electrodynamics', tasks: { total: 1, solved: 0 } }
const electrical = buildTopicMetrics({ topicSlug: 'electrodynamics', taskIds: [bridge], stages: buildLadder(electricalInput), attempts: [attempt], papers: [paper] })
assert.equal(electrical.route.completed, 0, 'A partial answer is not a completed task')
assert.equal(electrical.papers[0].score_percent, 57, 'The paper retains its own result')
assert.equal(electrical.skills.length, 3)
assert.ok(electrical.skills.every((skill) => !skill.confirmed && skill.successfulTasks === 0 && skill.evidence[0].id === attempt.id))
const repeated = buildTopicMetrics({ topicSlug: 'electrodynamics', taskIds: [bridge], stages: buildLadder(electricalInput), attempts: Array.from({ length: 10 }, (_, i) => ({ ...attempt, id: `attempt-${i}`, is_correct: true, score: 100 })), papers: [paper] })
assert.ok(repeated.skills.every((skill) => !skill.confirmed && skill.successfulTasks === 1), 'Ten submissions of one task are not three independent tasks')

const mathPaper = { ...paper, id: 'math-paper', task_ids: ['algebra-1', 'algebra-2'], score_percent: 33 }
const mathAttempts = mathPaper.task_ids.map((id) => ({ ...attempt, id: `attempt-${id}`, task_id: id, is_correct: true, score: 100, mock_test_id: mathPaper.id }))
const geometry = buildTopicMetrics({ topicSlug: 'geometry', taskIds: ['geometry-1'], stages: buildLadder({ ...empty, topicSlug: 'geometry', tasks: { total: 1, solved: 0 } }), attempts: mathAttempts, papers: [mathPaper] })
assert.equal(geometry.route.percent, 0)
assert.equal(geometry.attempts.length, 0)
assert.equal(geometry.papers.length, 0)
const stub = buildLadder({ ...empty, lesson: { id: 'stub', blocks: 0, minutes: 10, opened: true, completed: true } })
assert.equal(stub[0].state, 'empty', 'A lesson row without blocks is not a prepared lesson')
assert.equal(ladderPercent(stub), 0)
const opened = buildLadder({ ...empty, lesson: { id: 'note', blocks: 2, minutes: 10, opened: true, completed: false } })
assert.equal(ladderPercent(opened), 0, 'Opened does not mean completed')
assert.equal(opened[0].state, 'in-progress')
const partialRoute = buildTopicMetrics({ topicSlug: 'kinematics', taskIds: [], stages: buildLadder({ ...empty, lesson: { id: 'only-note', blocks: 2, minutes: 10, opened: true, completed: true } }), attempts: [], papers: [] })
assert.equal(partialRoute.route.percent, 100, 'Available actions may be finished')
assert.equal(partialRoute.coverage.complete, false, 'But a note alone is not a complete route')
assert.ok(!partialRoute.skills.some((skill) => skill.confirmed))

assert.deepEqual(methodsForTask(helicopter).map((method) => method.id), ['geometric-similarity', 'momentum-flux', 'energy-flux', 'dimensional-check'])
assert.deepEqual(methodsForTask(bridge).map((method) => method.id), ['kirchhoff-rules', 'balanced-bridge', 'iv-characteristic'])
assert.deepEqual(methodsForTask('__proto__'), [])
assert.deepEqual(methodsForTask('constructor'), [])
assert.deepEqual(methodsForTask('unclassified-mechanics-task'), [], 'Broad topic must not fabricate a method association')
assert.ok(methodsForTask(bridge).every((method) => method.source.url.includes('university-physics-volume-2/pages/')))
for (const method of TASK_METHODS) {
  assert.ok(method.prerequisites.length && method.steps.length && method.practice.explanation)
  for (const text of [method.idea, ...method.prerequisites.map((item) => item.explanation), ...method.steps.map((item) => item.body), method.practice.explanation]) {
    for (const formula of text.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)) {
      katex.renderToString(formula[1] ?? formula[2], { throwOnError: true, strict: 'error', output: 'htmlAndMathml' })
    }
  }
}
console.log('PASS: F01 isolation, empty routes, independent papers, skill evidence, repeated submissions, F09 exact methods and lesson formulas.')
