// node --import ./.tools/register.mjs .tools/planner-budget.mjs
import assert from 'node:assert/strict'
import { planDailySessions } from '@/lib/daily-preparation'
import { preparationCalendar, preparationPhase } from '@/lib/preparation-phases'
import { EMPTY_DAY } from '@/lib/day-state'

const DAY = 86_400_000
const at = (date, days) => new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10)
const topics = ['Mechanics', 'Electrodynamics', 'Thermodynamics'].map((name, position) => ({
  id: `topic-${position}`, name, slug: name.toLowerCase(), position, mastery: 50,
  lesson: { id: `lesson-${position}`, title: name, minutes: 25, completedAt: null },
  quiz: { minutes: 8, completedAt: null }, questionIds: [`question-${position}-1`, `question-${position}-2`],
}))
const tasks = topics.flatMap((topic, topicIndex) => Array.from({ length: 100 }, (_, index) => ({
  id: `phys-national-2024-10-t${topicIndex}-${index}`, title: `Problem ${index}`,
  paper: null, topic: topic.name, topicPosition: topic.position, source: null, level: 'republican',
  subject: 'Physics', difficulty: index % 5 + 1, estimatedMinutes: 85 + index % 3 * 5,
  gradeMin: 10, gradeMax: 10, solved: false, attempts: 0, saved: false,
})))
const input = {
  today: '2026-11-16', targetDate: '2027-01-11', goalStart: '2026-11-16T10:00:00.000Z',
  competitionSlug: 'kz-national-physics', competitionLevel: 'National', subject: 'Physics',
  grade: 'Grade 9–10', level: 'Building momentum',
  preferences: { weekdays: [1, 3, 5], sessionMinutes: 45, schoolGrade: 10, dailyTasks: 5 },
  day: EMPTY_DAY, topics, tasks, completedTasks: new Map(), mocks: [],
}

function assertBudget(source, plan) {
  const calendar = preparationCalendar(source)
  const capacity = new Map(calendar.map((day) => [day.date, day.capacityMinutes]))
  const totalBudget = calendar.reduce((sum, day) => sum + day.capacityMinutes, 0)
  let scheduled = 0
  const dates = new Set()
  for (const session of plan) {
    assert.ok(!dates.has(session.on_date), 'At most one session per date')
    dates.add(session.on_date)
    assert.ok(session.on_date >= source.today && session.on_date < source.targetDate)
    assert.ok(session.minutes > 0 && session.minutes <= capacity.get(session.on_date), `${session.minutes} > daily cap ${capacity.get(session.on_date)}`)
    if (session.session_kind !== 'mock') {
      assert.equal(session.minutes, session.lesson_minutes + session.quiz_minutes + session.review_minutes + session.task_minutes.reduce((a, b) => a + b, 0), 'Every minute is accounted for once')
      assert.equal(session.task_ids.length, session.task_minutes.length)
      assert.equal(session.task_ids.length, session.task_parts.length)
      assert.equal(session.task_ids.length, session.task_part_totals.length)
      assert.ok(session.task_ids.length <= (source.preferences.dailyTasks ?? 5))
    }
    assert.notEqual(session.phase, 'rest')
    if (session.phase === 'taper') {
      assert.equal(session.session_kind, 'review')
      assert.equal(session.lesson_minutes, 0)
      assert.equal(session.task_ids.length, 0)
      const agreed = source.preferences.minutesByWeekday?.[new Date(session.on_date).getUTCDay()] ?? source.preferences.sessionMinutes
      assert.ok(session.minutes <= Math.min(30, agreed / 2))
    }
    if (session.session_kind === 'study') assert.ok(session.review_minutes > 0, 'Study day includes actual time for review')
    scheduled += session.minutes
  }
  assert.ok(scheduled <= totalBudget, `${scheduled} assigned in ${totalBudget} available minutes`)
  return { scheduled, totalBudget }
}

// Previously this fixed daily quota produced ~193 hours in an 18-hour window.
const short = planDailySessions(input, topics)
const budget = assertBudget(input, short)
assert.equal(8 * 3 * 45, 18 * 60)
assert.ok(budget.scheduled <= 18 * 60)
assert.ok(budget.totalBudget <= 18 * 60)
assert.ok(short.some((session) => session.session_kind === 'study'))
assert.deepEqual(short, planDailySessions(input, topics), 'Reload does not randomize assignments')

for (const sessionMinutes of [15, 30, 45, 90]) {
  for (const dailyTasks of [1, 5, 10]) {
    const source = { ...input, preferences: { ...input.preferences, sessionMinutes, dailyTasks } }
    assertBudget(source, planDailySessions(source, topics))
  }
}
const varied = { ...input, preferences: { ...input.preferences, minutesByWeekday: { 1: 15, 3: 30, 5: 90 } } }
assertBudget(varied, planDailySessions(varied, topics))
const tired = { ...input, day: { ...EMPTY_DAY, reported: true, mental: 2 }, reservedMinutesByDate: { [input.today]: 7 } }
assert.equal(preparationCalendar(tired)[0].capacityMinutes, Math.floor(45 / 2) - 7)
assertBudget(tired, planDailySessions(tired, topics))

const target = '2027-04-11'
assert.equal(preparationPhase('2027-01-01', target, '2027-01-01'), 'foundation')
assert.equal(preparationPhase('2027-02-10', target, '2027-01-01'), 'strengthening')
assert.equal(preparationPhase('2027-03-25', target, '2027-01-01'), 'competition')
assert.equal(preparationPhase('2027-04-06', target, '2027-01-01'), 'taper')
assert.equal(preparationPhase('2027-04-08', target, '2027-01-01'), 'taper')
assert.equal(preparationPhase('2027-04-09', target, '2027-01-01'), 'rest')
assert.equal(preparationPhase('2027-04-10', target, '2027-01-01'), 'rest')
const calendar = preparationCalendar(input)
assert.equal(calendar.length, 56)
assert.ok(calendar.some((day) => !day.studyDay && day.capacityMinutes === 0), 'Calendar includes off days')
assert.ok(calendar.slice(-2).every((day) => day.phase === 'rest' && day.capacityMinutes === 0))
assert.equal(preparationCalendar({ ...input, targetDate: '2030-01-01' }).length, 730)
assert.deepEqual(preparationCalendar({ ...input, targetDate: input.today }), [])
assert.deepEqual(preparationCalendar({ ...input, today: 'invalid' }), [])

const openMock = { id: 'open', key: 'mock-1', taskIds: ['external-task'], minutes: 30, startedAt: input.today + 'T10:00:00Z', completedAt: null, reviewedAt: null, missedTaskIds: [] }
const longTopic = [{ ...topics[0], lesson: { ...topics[0].lesson, minutes: 90 }, quiz: { minutes: 15, completedAt: null } }]
const longTask = { ...tasks[0], estimatedMinutes: 120 }
const longInput = { ...input, targetDate: '2026-12-21', topics: longTopic, tasks: [longTask], preferences: { ...input.preferences, weekdays: [0, 1, 2, 3, 4, 5, 6], sessionMinutes: 30, dailyTasks: 1 }, mocks: [openMock] }
const longPlan = planDailySessions(longInput, longTopic)
assertBudget(longInput, longPlan)
assert.equal(longPlan.reduce((sum, session) => sum + session.lesson_minutes, 0), 90, 'Long lesson estimate is preserved')
assert.equal(longPlan.reduce((sum, session) => sum + session.task_minutes.reduce((a, b) => a + b, 0), 0), 120, 'Long problem estimate is preserved')
assert.equal(longPlan.reduce((sum, session) => sum + session.quiz_minutes, 0), 15, 'Long quiz estimate is preserved')
const taskParts = longPlan.filter((session) => session.task_ids.includes(longTask.id))
assert.ok(taskParts.length > 1)
assert.deepEqual(taskParts.map((session) => session.task_parts[0]), Array.from({ length: taskParts.length }, (_, index) => index + 1))
assert.ok(taskParts.every((session) => session.task_part_totals[0] === taskParts.length))
const remainingInput = { ...longInput, workCompleted: { [`lesson:${longTopic[0].lesson.id}`]: 60, [`task:${longTask.id}`]: 90, [`quiz:${longTopic[0].slug}`]: 10 } }
const remaining = planDailySessions(remainingInput, longTopic)
assertBudget(remainingInput, remaining)
assert.equal(remaining.reduce((sum, session) => sum + session.lesson_minutes, 0), 30)
assert.equal(remaining.reduce((sum, session) => sum + session.task_minutes.reduce((a, b) => a + b, 0), 0), 30)
assert.equal(remaining.reduce((sum, session) => sum + session.quiz_minutes, 0), 5)
// The settings allow up to half of the timebox for reflection. Preserve that
// agreement instead of silently assigning extra content above the chosen share.
const halfReviewInput = { ...longInput, preferences: { ...longInput.preferences, reviewPercent: 50 } }
const halfReview = planDailySessions(halfReviewInput, longTopic)
assertBudget(halfReviewInput, halfReview)
for (const session of halfReview.filter((day) => day.session_kind === 'study')) {
  const agreed = preparationCalendar(halfReviewInput).find((day) => day.date === session.on_date).capacityMinutes
  assert.equal(session.review_minutes, Math.ceil(agreed / 2), 'Honor the chosen 50% review reserve')
  assert.ok(session.minutes - session.review_minutes <= Math.floor(agreed / 2))
}
// Completed timeboxes without a correct submission do not loop into infinite debt.
assert.doesNotThrow(() => planDailySessions({ ...longInput, workCompleted: { [`task:${longTask.id}`]: 120 } }, longTopic))
const tooLate = { ...longInput, targetDate: at(longInput.today, 7), topics: [{ ...longTopic[0], lesson: { ...longTopic[0].lesson, minutes: 10 } }] }
const late = planDailySessions(tooLate, tooLate.topics)
assert.ok(late.every((session) => !session.task_ids.includes(longTask.id)), 'Do not start an activity whose full remaining effort cannot fit')

const completeMock = { ...openMock, id: 'finished', minutes: 360, completedAt: input.today + 'T10:00:00Z', missedTaskIds: ['external-task'] }
const reviewInput = { ...longInput, tasks: [], topics: [], mocks: [completeMock] }
const reviews = planDailySessions(reviewInput, [])
assertBudget(reviewInput, reviews)
const paperReviews = reviews.filter((session) => session.review_mock_key === completeMock.key)
assert.equal(paperReviews.reduce((sum, session) => sum + session.review_minutes, 0), 90, 'Full review time is reserved across dates, never clipped')
assert.ok(paperReviews.length > 1)
assert.ok(paperReviews.every((session) => session.review_parts === paperReviews.length))
const reviewRemaining = planDailySessions({ ...reviewInput, workCompleted: { 'review:mock-1': 30 } }, [])
assert.equal(reviewRemaining.filter((session) => session.review_mock_key === completeMock.key).reduce((sum, session) => sum + session.review_minutes, 0), 60)
for (const mock of short.filter((session) => session.session_kind === 'mock')) {
  const review = short.filter((session) => session.review_mock_key === mock.mock_key)
  assert.ok(review.length)
  assert.ok(review.every((session) => session.on_date > mock.on_date))
  assert.equal(review.reduce((sum, session) => sum + session.review_minutes, 0), Math.max(10, Math.ceil(mock.minutes / 4)))
}

const weak = [{ ...topics[0], mastery: 90 }, { ...topics[1], mastery: 10 }]
const weakPlan = planDailySessions({ ...input, topics: weak, mocks: [openMock] }, weak)
assert.equal(weakPlan.find((session) => session.topic_id)?.topic_id, weak[1].id, 'Observed weakness outranks broad archive frequency')
const skillTasks = [{ ...tasks[0], id: 'phys-national-unlinked', estimatedMinutes: 25 }, { ...tasks[1], id: 'phys-national-friction', estimatedMinutes: 25, difficulty: tasks[0].difficulty }]
const skillInput = { ...longInput, tasks: skillTasks, topics: [{ ...topics[0], lesson: null, questionIds: [], quiz: null }], taskSkillIds: { 'phys-national-friction': ['static-friction'] }, skillPriorities: { 'static-friction': 100 } }
const skillPlan = planDailySessions(skillInput, skillInput.topics)
assert.equal(skillPlan.find((session) => session.task_ids.length)?.task_ids[0], 'phys-national-friction')

// A 90-minute day can leave one minute after its meaningful activities;
// that spare minute must not create a new "part 1/2" of another long task.
const ninetyTopic = { ...topics[0], lesson: { ...topics[0].lesson, minutes: 25 }, questionIds: ['ninety-q1', 'ninety-q2', 'ninety-q3'], quiz: { minutes: 6, completedAt: null } }
const ninetyTasks = [0, 1].map((index) => ({ ...tasks[index], id: `phys-national-ninety-${index}`, difficulty: 3, estimatedMinutes: 40 }))
const ninetyInput = { ...longInput, preferences: { ...longInput.preferences, sessionMinutes: 90 }, topics: [ninetyTopic], tasks: ninetyTasks }
const ninetyPlan = planDailySessions(ninetyInput, [ninetyTopic])
assertBudget(ninetyInput, ninetyPlan)
assert.equal(ninetyPlan.find((session) => session.on_date === ninetyInput.today).minutes, 89)
assert.deepEqual(ninetyPlan.find((session) => session.on_date === ninetyInput.today).task_ids, ['phys-national-ninety-0'])
for (const task of ninetyTasks) assert.equal(ninetyPlan.reduce((sum, session) => sum + session.task_ids.reduce((minutes, id, i) => minutes + (id === task.id ? session.task_minutes[i] : 0), 0), 0), 40, 'Skipping spare room preserves the full future problem estimate')
const finalMinuteInput = { ...ninetyInput, topics: [{ ...ninetyTopic, lesson: null, quiz: null, questionIds: [] }], tasks: [ninetyTasks[1]], workCompleted: { [`task:${ninetyTasks[1].id}`]: 39 } }
const finalMinutePlan = planDailySessions(finalMinuteInput, finalMinuteInput.topics)
assert.equal(finalMinutePlan.reduce((sum, session) => sum + session.task_minutes.reduce((a, b) => a + b, 0), 0), 1, 'A real final minute remains one minute')

// A split quiz must not present the full question set on every day. Answering
// the first chunk must leave the other questions (and their time) for later.
const quizTopic = { ...topics[0], lesson: null, questionIds: Array.from({ length: 15 }, (_, i) => `split-q-${i}`), quiz: { minutes: 30, completedAt: null } }
const quizInput = { ...longInput, tasks: [], topics: [quizTopic], preferences: { ...longInput.preferences, sessionMinutes: 15 } }
const quizPlan = planDailySessions(quizInput, [quizTopic]).filter((session) => session.quiz_minutes > 0)
assert.ok(quizPlan.length > 1)
assert.deepEqual(quizPlan.flatMap((session) => session.question_ids), quizTopic.questionIds, 'Each question belongs to exactly one chunk')
assert.ok(quizPlan.every((session) => session.question_ids.length > 0))
assert.ok(quizPlan.every((session) => session.question_ids.length * 2 === session.quiz_minutes), 'Whole questions fit their declared timebox')
const quizDone = quizPlan[0].quiz_minutes
const quizRemaining = planDailySessions({ ...quizInput, workCompleted: { [`quiz:${quizTopic.slug}`]: quizDone } }, [quizTopic]).filter((session) => session.quiz_minutes > 0)
assert.deepEqual(quizRemaining.flatMap((session) => session.question_ids), quizTopic.questionIds.slice(quizPlan[0].question_ids.length))
assert.equal(quizRemaining.reduce((sum, session) => sum + session.quiz_minutes, 0), 30 - quizDone)
// A day with only one spare minute cannot carry half of a two-minute question.
const tinyRoomTopic = { ...quizTopic, questionIds: ['tiny-a', 'tiny-b'], quiz: { minutes: 4, completedAt: null } }
const tinyRoom = planDailySessions({ ...quizInput, reservedMinutesByDate: { [quizInput.today]: 13 } }, [tinyRoomTopic])
assert(!tinyRoom.some((session) => session.on_date === quizInput.today && session.quiz_minutes > 0))

// The same verified weak skill should start with a more approachable problem;
// strong results leave the competition-appropriate difficulty unchanged.
const difficultyTopic = { ...topics[0], lesson: null, questionIds: [], quiz: null, mastery: null }
const difficultyTasks = [2, 3].map((difficulty) => ({ ...tasks[0], id: `phys-national-difficulty-${difficulty}`, difficulty, estimatedMinutes: 20 }))
const difficultyInput = { ...longInput, level: 'Building momentum', tasks: difficultyTasks, topics: [difficultyTopic], taskSkillIds: Object.fromEntries(difficultyTasks.map((task) => [task.id, ['friction']])), skillPriorities: { friction: 100 } }
assert.equal(planDailySessions(difficultyInput, [difficultyTopic]).find((session) => session.task_ids.length)?.task_ids[0], 'phys-national-difficulty-2')
assert.equal(planDailySessions({ ...difficultyInput, skillPriorities: { friction: 0 } }, [difficultyTopic]).find((session) => session.task_ids.length)?.task_ids[0], 'phys-national-difficulty-3')
assert.equal(planDailySessions({ ...difficultyInput, taskSkillWeights: Object.fromEntries(difficultyTasks.map((task) => [task.id, { friction: 0.25 }])) }, [difficultyTopic]).find((session) => session.task_ids.length)?.task_ids[0], 'phys-national-difficulty-3', 'A speculative tag does not lower task difficulty')

const moved = { ...input, today: at(input.today, 14) }
const replanned = planDailySessions(moved, topics)
assertBudget(moved, replanned)
assert.ok(replanned.every((session) => session.on_date >= moved.today), 'A missed week is not an overdue queue copied onto today')
assert.deepEqual(planDailySessions({ ...input, tasks: [], topics: [] }, []), [], 'No material must not create a pretend completed curriculum')
console.log(`PASS: time budget (${budget.scheduled}/${budget.totalBudget} min, never 193h/18h), daily caps, full effort chunks, review, phases/rest, explicit skills, deterministic replanning.`)
