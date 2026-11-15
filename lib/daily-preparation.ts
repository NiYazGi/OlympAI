import { isCompetitionTask, analyseCompetition } from '@/lib/competition-analysis'
import { fitsGrade, gradeRange } from '@/lib/profile-options'
import { realPapers } from '@/lib/mock'
import { makeMock, type PreparationInput, type PreparationTopic } from '@/lib/preparation'
import { preparationCalendar, type PreparationPhase } from '@/lib/preparation-phases'
import type { CatalogueTask } from '@/lib/types'

export type DailyTopic = PreparationTopic & { id: string; questionIds: string[] }
export type DailyDraft = {
  on_date: string
  topic_id: string | null
  lesson_id: string | null
  task_ids: string[]
  question_ids: string[]
  minutes: number
  mock_key: string | null
  full_paper: boolean
  phase: PreparationPhase
  session_kind: 'study' | 'mock' | 'review'
  lesson_minutes: number
  task_minutes: number[]
  quiz_minutes: number
  review_minutes: number
  lesson_part: number
  lesson_parts: number
  task_parts: number[]
  task_part_totals: number[]
  quiz_part: number
  quiz_parts: number
  review_mock_key: string | null
  review_part: number
  review_parts: number
}

type Slot = { date: string; phase: PreparationPhase; capacity: number; review: number; used: number; draft: DailyDraft | null }
type Work = { key: string; kind: 'lesson' | 'task' | 'quiz'; id: string; minutes: number; topic: DailyTopic }
type Allocation = { slot: Slot; minutes: number; questionIds?: string[] }
const safeMinutes = (value: number | null | undefined, fallback: number) =>
  Math.max(1, Math.ceil(Number.isFinite(value) && value! > 0 ? value! : fallback))
const recordedMinutes = (value: number | undefined) => Number.isFinite(value) ? Math.max(0, Math.floor(value!)) : 0

function emptyDraft(slot: Slot, kind: DailyDraft['session_kind'] = 'study'): DailyDraft {
  return { on_date: slot.date, topic_id: null, lesson_id: null, task_ids: [], question_ids: [], minutes: 0,
    mock_key: null, full_paper: false, phase: slot.phase, session_kind: kind, lesson_minutes: 0,
    task_minutes: [], quiz_minutes: 0, review_minutes: 0, lesson_part: 0, lesson_parts: 0,
    task_parts: [], task_part_totals: [], quiz_part: 0, quiz_parts: 0, review_mock_key: null, review_part: 0, review_parts: 0 }
}

/**
 * A finite minute budget, rather than a fixed five-problem daily quota.
 * Each activity keeps its full estimate; a long activity is explicitly split
 * across dates. Activities that cannot fit completely are not assigned.
 * Root persistence supplies actual completed minutes when rebuilding a plan.
 */
export function planDailySessions(input: PreparationInput, topics: DailyTopic[]): DailyDraft[] {
  const taskLimit = Math.max(1, Math.min(10, Math.floor(input.preferences.dailyTasks ?? 5)))
  const reviewPercent = Math.max(10, Math.min(50, input.preferences.reviewPercent ?? 20))
  const slots: Slot[] = preparationCalendar(input).filter((day) => day.capacityMinutes > 0).map((day) => ({
    date: day.date, phase: day.phase, capacity: day.capacityMinutes,
    review: Math.max(1, Math.ceil(day.capacityMinutes * reviewPercent / 100)), used: 0, draft: null,
  }))
  if (!slots.length) return []
  const grade = input.preferences.schoolGrade
  const range: [number, number] | null = grade ? [grade, grade] : gradeRange(input.grade)
  const exact = (task: { id: string }) => isCompetitionTask(task, input.competitionSlug)
  const reserved = new Set(input.mocks.flatMap((mock) => mock.taskIds))
  const pool = input.tasks.filter((task) => task.subject === input.subject && fitsGrade(task, range) &&
    !task.solved && !input.completedTasks.has(task.id) && !reserved.has(task.id))
  const taskWeakness = (task: CatalogueTask) => Math.max(0, ...(input.taskSkillIds?.[task.id] ?? [])
    .map((id) => (input.skillPriorities?.[id] ?? 0) * (input.taskSkillWeights?.[task.id]?.[id] ?? 1)))
  const analysis = analyseCompetition(pool, input.subject, input.competitionSlug)
  const importance = new Map(analysis.topics.map((topic, index) => [topic.topic, index]))
  const topicWeakness = (topic: DailyTopic) => 100 - (topic.mastery ?? 50) +
    Math.max(0, ...pool.filter((task) => task.topic === topic.name).map(taskWeakness))
  const ordered = [...topics].filter((topic) => topic.lesson || topic.questionIds.length || pool.some((task) => task.topic === topic.name))
    .sort((a, b) => topicWeakness(b) - topicWeakness(a) ||
      (importance.get(a.name) ?? 100) - (importance.get(b.name) ?? 100) || a.position - b.position || a.id.localeCompare(b.id))

  if (!ordered.length && !input.mocks.some((mock) => mock.completedAt)) return []

  // Taper is deliberately only review. Last two full days have zero slots.
  for (const slot of slots.filter((day) => day.phase === 'taper')) {
    const draft = emptyDraft(slot, 'review')
    draft.review_minutes = Math.min(30, slot.capacity)
    draft.minutes = draft.review_minutes
    slot.draft = draft
  }

  function reserveReview(key: string, duration: number, after: string, strict = false) {
    const remaining = Math.max(0, duration - recordedMinutes(input.workCompleted?.[`review:${key}`]))
    if (!remaining) return true
    const eligible = slots.filter((day) => (strict ? day.date > after : day.date >= after) &&
      (!day.draft || day.phase === 'taper' && !day.draft.review_mock_key))
    if (eligible.reduce((sum, slot) => sum + slot.capacity, 0) < remaining) return false
    let left = remaining
    const parts: Allocation[] = []
    for (const slot of eligible) {
      const take = Math.min(slot.capacity, left)
      parts.push({ slot, minutes: take })
      left -= take
      if (!left) break
    }
    for (const [index, part] of parts.entries()) {
      const draft = emptyDraft(part.slot, 'review')
      draft.review_mock_key = key
      draft.review_minutes = part.minutes
      draft.minutes = part.minutes
      draft.review_part = index + 1
      draft.review_parts = parts.length
      part.slot.draft = draft
    }
    return true
  }
  // Reviews of completed papers have priority, and consume their full estimate.
  for (const mock of input.mocks.filter((mock) => mock.completedAt && !mock.reviewedAt && mock.missedTaskIds.length)) {
    reserveReview(mock.key, Math.max(10, Math.ceil(mock.minutes / 4)), mock.completedAt!.slice(0, 10))
  }

  const rehearsalSlots = slots.filter((day) => day.phase === 'competition' && !day.draft &&
    Math.round((Date.parse(input.targetDate) - Date.parse(day.date)) / 86_400_000) <= 14 && day.capacity >= 15)
  const proposed = rehearsalSlots.length >= 6
    ? [rehearsalSlots[Math.floor(rehearsalSlots.length / 3)], rehearsalSlots[rehearsalSlots.length - 2]]
    : rehearsalSlots.length ? [rehearsalSlots[Math.max(0, rehearsalSlots.length - 2)]] : []
  const mockKeys = ['mock-1', 'mock-2'].filter((key) => !input.mocks.some((mock) => mock.key === key))
  if (!input.mocks.some((mock) => !mock.completedAt)) {
    for (const slot of proposed) {
      if (!mockKeys.length || slot.draft) continue
      const available = pool.filter((task) => !reserved.has(task.id))
      const mock = makeMock(available, realPapers(available), exact, slot.capacity)
      if (!mock || mock.minutes > slot.capacity) continue
      const key = mockKeys[0]
      if (!reserveReview(key, Math.max(10, Math.ceil(mock.minutes / 4)), slot.date, true)) continue
      const draft = emptyDraft(slot, 'mock')
      draft.mock_key = mockKeys.shift()!
      draft.task_ids = mock.mock.taskIds
      draft.full_paper = mock.mock.fullPaper
      // A timed practice is a declared timebox, not a promise that all
      // selected problems can be fully solved in that time.
      draft.minutes = mock.minutes
      slot.draft = draft
      mock.mock.taskIds.forEach((id) => reserved.add(id))
    }
  }

  const allocated = new Map<string, Allocation[]>()
  const lastDateByTopic = new Map<string, string>()
  function assign(work: Work) {
    const remaining = Math.max(0, work.minutes - recordedMinutes(input.workCompleted?.[work.key]))
    if (!remaining) { allocated.set(work.key, []); return true }
    const eligible = slots.filter((slot) => slot.phase !== 'taper' &&
      (!slot.draft || slot.draft.session_kind === 'study' && slot.draft.topic_id === work.topic.id) &&
      slot.date >= (lastDateByTopic.get(work.topic.id) ?? input.today) &&
      (work.kind !== 'task' || (slot.draft?.task_ids.length ?? 0) < taskLimit))
    if (eligible.reduce((sum, slot) => sum + Math.max(0, slot.capacity - slot.review - slot.used), 0) < remaining) return false
    const parts: Allocation[] = []
    let left = remaining
    if (work.kind === 'quiz') {
      // A daily quiz chunk contains only its own questions. Duplicating every
      // question into every chunk let the first part complete the whole quiz.
      // Keep a question together even when a day has a minute of spare room.
      const count = work.topic.questionIds.length
      const done = recordedMinutes(input.workCompleted?.[work.key])
      let cursor = 0
      for (let index = 0; index < count; index++) {
        const start = Math.ceil(index * work.minutes / count)
        const end = Math.ceil((index + 1) * work.minutes / count)
        const take = Math.max(0, end - Math.max(start, done))
        if (!take) continue
        let slot = eligible[cursor]
        while (slot) {
          const allocated = parts.find((part) => part.slot === slot)
          const room = slot.capacity - slot.review - slot.used - (allocated?.minutes ?? 0)
          if (room >= take) {
            if (allocated) { allocated.minutes += take; allocated.questionIds!.push(work.topic.questionIds[index]) }
            else parts.push({ slot, minutes: take, questionIds: [work.topic.questionIds[index]] })
            left -= take
            break
          }
          slot = eligible[++cursor]
        }
        if (!slot) return false
      }
    } else for (const slot of eligible) {
      const room = Math.max(0, slot.capacity - slot.review - slot.used)
      if (!room) continue
      // Do not open a substantial problem for a leftover minute. A genuinely
      // short final remainder can still be finished without inflating its cost.
      if (work.kind === 'task' && room < 5 && left > room) continue
      const take = Math.min(room, left)
      parts.push({ slot, minutes: take })
      left -= take
      if (!left) break
    }
    if (left) return false
    for (const [index, part] of parts.entries()) {
      const draft = part.slot.draft ?? emptyDraft(part.slot)
      draft.topic_id = work.topic.id
      if (work.kind === 'lesson') {
        draft.lesson_id = work.id
        draft.lesson_minutes += part.minutes
        draft.lesson_part = index + 1
        draft.lesson_parts = parts.length
      } else if (work.kind === 'quiz') {
        draft.question_ids = part.questionIds ?? []
        draft.quiz_minutes += part.minutes
        draft.quiz_part = index + 1
        draft.quiz_parts = parts.length
      } else {
        draft.task_ids.push(work.id)
        draft.task_minutes.push(part.minutes)
        draft.task_parts.push(index + 1)
        draft.task_part_totals.push(parts.length)
      }
      part.slot.used += part.minutes
      draft.review_minutes = part.slot.review
      draft.minutes = part.slot.used + draft.review_minutes
      part.slot.draft = draft
    }
    allocated.set(work.key, parts)
    lastDateByTopic.set(work.topic.id, parts[parts.length - 1].slot.date)
    return true
  }

  const stage = input.preferences.stage ?? input.competitionLevel
  const competitionDifficulty = stage === 'International' ? 5 : stage === 'National' ? 4 : stage === 'School' ? 2 : 3
  function candidateTasks(topic: DailyTopic) {
    const all = pool.filter((task) => task.topic === topic.name && !reserved.has(task.id) &&
      !allocated.has(`task:${task.id}`))
    const queue = all.some(exact) ? all.filter(exact) : all
    const firstAvailable = slots.find((slot) => !slot.draft || slot.draft.session_kind === 'study' && slot.draft.topic_id === topic.id &&
      slot.capacity - slot.review - slot.used > 0)
    const phase = firstAvailable?.phase ?? 'competition'
    const target = Math.max(1, competitionDifficulty - (phase === 'foundation' ? 1 : phase === 'strengthening' ? 0.5 : 0) -
      (input.level === 'Getting started' || topic.mastery !== null && topic.mastery < 40 ? 1 : 0))
    // Diagnostic weakness reduces the starting difficulty only for tasks
    // linked to that skill. Candidate tags have lower weights and cannot
    // lower all of the subject's tasks through a broad topic match.
    const targetFor = (task: CatalogueTask) => Math.max(1, target - (taskWeakness(task) >= 50 ? 1 : 0))
    return queue.sort((a, b) => taskWeakness(b) - taskWeakness(a) || Math.abs(a.difficulty - targetFor(a)) - Math.abs(b.difficulty - targetFor(b)) ||
      safeMinutes(a.estimatedMinutes, 25) - safeMinutes(b.estimatedMinutes, 25) || a.id.localeCompare(b.id))
  }
  const taskWork = (topic: DailyTopic, task: CatalogueTask): Work => ({
    key: `task:${task.id}`, kind: 'task', id: task.id, minutes: safeMinutes(task.estimatedMinutes, 25), topic,
  })

  // One base cycle through the relevant topics before extra task practice.
  // Fewer tasks is valid; overspending the learner's time is not.
  const active: DailyTopic[] = []
  for (const topic of ordered) {
    if (topic.lesson && !topic.lesson.completedAt) {
      if (!assign({ key: `lesson:${topic.lesson.id}`, kind: 'lesson', id: topic.lesson.id,
        minutes: safeMinutes(topic.lesson.minutes, 15), topic })) continue
    }
    const first = candidateTasks(topic).find((task) => assign(taskWork(topic, task)))
    if (topic.questionIds.length && !topic.quiz?.completedAt && (first || !candidateTasks(topic).length)) {
      assign({ key: `quiz:${topic.slug}`, kind: 'quiz', id: topic.slug, minutes: safeMinutes(topic.quiz?.minutes, 6), topic })
    }
    if (candidateTasks(topic).length) active.push(topic)
  }
  // An assignment either consumes minutes or removes a finite candidate.
  // A task that cannot fit is skipped; no loop can create endless debt.
  const skipped = new Set<string>()
  let changed = true
  while (changed) {
    changed = false
    for (const topic of active) {
      const candidates = candidateTasks(topic).filter((task) => !skipped.has(task.id))
      for (const task of candidates) {
        if (assign(taskWork(topic, task))) { changed = true; break }
        skipped.add(task.id)
      }
    }
  }
  // Safe to assert locally: this is the invariant persistence must preserve.
  return slots.flatMap((slot) => {
    if (!slot.draft) return []
    if (slot.draft.minutes > slot.capacity) throw new Error('Preparation exceeded agreed daily capacity')
    return [slot.draft]
  })
}
