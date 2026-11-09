// Run with node --import ./.tools/register.mjs .tools/preparation.mjs
import assert from 'node:assert/strict'
import { EMPTY_DAY } from '@/lib/day-state'
import { buildPreparation } from '@/lib/preparation'

const topics = ['Mechanics', 'Optics'].map((name, position) => ({
  name, position, slug: name.toLowerCase(), mastery: null,
  lesson: { id: name, title: name, minutes: 10, completedAt: null },
  quiz: { minutes: 6, completedAt: null },
}))
const tasks = ['national', 'oblast'].flatMap((archive) => [9, 10, 11].flatMap((grade) =>
  Array.from({ length: 12 }, (_, index) => ({
    id: `phys-${archive}-2024-${grade}-t1-${index + 1}`, title: `Task ${index + 1}`,
    paper: `phys-${archive}-2024-${grade}-t1`, topic: topics[index % 2].name,
    subject: 'Physics', difficulty: archive === 'national' ? 4 : 3,
    estimatedMinutes: 35, gradeMin: grade, gradeMax: grade, solved: false, attempts: 0,
  })),
))
const input = {
  today: '2026-11-09', targetDate: '2026-12-11', goalStart: '2026-11-01T00:00:00.000Z',
  competitionSlug: 'kz-national-physics', competitionLevel: 'National',
  subject: 'Physics', grade: 'Grade 9–10', level: 'Building momentum',
  preferences: { weekdays: [1, 3, 5], sessionMinutes: 45, schoolGrade: 10 },
  day: EMPTY_DAY, topics, tasks, completedTasks: new Map(), mocks: [],
}

const national = buildPreparation(input)
assert.deepEqual(new Set(national.steps.map((step) => step.kind)), new Set(['lesson', 'quiz', 'task', 'mock']))
for (const step of national.steps) {
  assert.ok([1, 3, 5].includes(new Date(step.date).getUTCDay()), 'Study starts on a chosen weekday')
  assert.ok((step.endDate ?? step.date) < '2026-12-09', 'The last two days are reserved for rest')
}
assert.ok(national.scheduledMinutes <= national.preferredMinutes)
assert.ok(national.steps.filter((step) => step.kind === 'task')
  .every((step) => step.href.includes('/phys-national-2024-10-')))
const mock = national.steps.find((step) => step.kind === 'mock')
assert.ok(mock.date >= '2026-11-27' && mock.minutes <= 45)
assert.ok(mock.mock.taskIds.every((id) => id.startsWith('phys-national-2024-10-')))

const regional = buildPreparation({ ...input, competitionSlug: 'kz-regional-physics', competitionLevel: 'Regional' })
assert.ok(regional.steps.some((step) => step.href?.includes('/phys-oblast-2024-10-')))
assert.ok(regional.steps.every((step) => !step.href?.includes('/phys-national-')))
const noArchive = buildPreparation({ ...input, competitionSlug: 'ipho', competitionLevel: 'International' })
assert.equal(noArchive.hasArchive, false)
assert.ok(noArchive.steps.filter((step) => step.kind === 'task').every((step) => step.source === 'similar'))

const completed = tasks.find((task) => task.id.startsWith('phys-national-2024-10-'))
const revised = buildPreparation({
  ...input, targetDate: '2026-11-20', day: { ...EMPTY_DAY, reported: true, mental: 2 },
  tasks: tasks.map((task) => task.id === completed.id ? { ...task, solved: true } : task),
  completedTasks: new Map([[completed.id, '2026-11-06T11:00:00.000Z']]),
  topics: topics.map((topic) => topic.name === 'Optics' ? { ...topic, mastery: 10 } : topic),
})
assert.equal(revised.adaptedToday, true)
assert.equal(revised.steps[0].id, `task-${completed.id}`)
assert.ok(revised.steps[0].completedAt)
assert.equal(revised.steps.find((step) => !step.completedAt).topic, 'Optics')
assert.ok(revised.scheduledMinutes <= revised.preferredMinutes)
assert.deepEqual(buildPreparation({ ...input, targetDate: '2026-11-08' }).steps, [])

const reviewed = buildPreparation({
  ...input,
  mocks: [{
    id: 'test-paper', key: mock.id, minutes: mock.minutes, taskIds: mock.mock.taskIds,
    startedAt: '2026-11-08T10:00:00.000Z', completedAt: '2026-11-08T10:45:00.000Z',
    missedTaskIds: mock.mock.taskIds, reviewedAt: '2026-11-09T10:00:00.000Z',
  }],
})
assert.ok(reviewed.steps.some((step) => step.id === 'review-test-paper' && step.completedAt))
assert.equal(new Set(reviewed.steps.map((step) => step.id)).size, reviewed.steps.length)
console.log('PASS: competition and grade selection, deadline and session limits, timed rehearsal, adaptive priority, preserved progress.')
