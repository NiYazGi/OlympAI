import { CRUNCH_DAYS, TAPER_DAYS, type DayInputs } from '@/lib/day-state'
import { realPapers, type RealPaper } from '@/lib/mock'
import { fitsGrade, gradeRange } from '@/lib/profile-options'
import type { CatalogueTask } from '@/lib/types'

export type PreparationPreferences = {
  weekdays: number[]
  sessionMinutes: number
  schoolGrade: number | null
}

export function defaultPreparationPreferences(intensity: string | null | undefined): PreparationPreferences {
  if (intensity === '3 short sessions a week') return { weekdays: [1, 3, 5], sessionMinutes: 30, schoolGrade: null }
  if (intensity === 'Daily intensive practice') return { weekdays: [0, 1, 2, 3, 4, 5, 6], sessionMinutes: 60, schoolGrade: null }
  return { weekdays: [1, 2, 3, 4, 5], sessionMinutes: 45, schoolGrade: null }
}

export type PreparationTopic = {
  name: string
  slug: string
  position: number
  mastery: number | null
  lesson: { id: string; title: string; minutes: number; completedAt: string | null } | null
  quiz: { minutes: number; completedAt: string | null } | null
}

export type PreparationMock = {
  id: string
  key: string
  taskIds: string[]
  minutes: number
  startedAt: string
  completedAt: string | null
  reviewedAt: string | null
  missedTaskIds: string[]
}

type Activity = {
  id: string
  kind: 'lesson' | 'quiz' | 'task' | 'mock' | 'review'
  title: string
  topic?: string
  href?: string
  minutes: number
  source?: 'archive' | 'similar'
  mock?: { taskIds: string[]; fullPaper: boolean }
  completedAt?: string
}

export type PreparationStep = Activity & { date: string; endDate?: string }

export type PreparationPlan = {
  steps: PreparationStep[]
  preferredMinutes: number
  scheduledMinutes: number
  daysLeft: number
  hasArchive: boolean
  hasMaterials: boolean
  adaptedToday: boolean
  priorityOnly: boolean
}

type Input = {
  today: string
  targetDate: string
  goalStart: string
  competitionSlug: string | null
  competitionLevel: string | null
  subject: string
  grade: string | null
  level: string | null
  preferences: PreparationPreferences
  day: DayInputs
  topics: PreparationTopic[]
  tasks: CatalogueTask[]
  completedTasks: ReadonlyMap<string, string>
  mocks: PreparationMock[]
}

const DAY = 86_400_000
const MAX_HORIZON = 730
const asDate = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const dayTime = (date: string) => Date.parse(`${date}T00:00:00Z`)

// Archive identifiers used by the importers. A competition card's subject is
// insufficient evidence that a paper came from that competition.
const ARCHIVE: Record<string, string> = {
  'kz-national-math': 'national-', 'kz-regional-math': 'oblast-',
  'kz-national-physics': 'phys-national-', 'kz-regional-physics': 'phys-oblast-',
  gzho: 'gzho-', apmo: 'apmo-', bmo: 'bmo-', jbmo: 'jbmo-', 'silk-road': 'silk-road-',
}

type Slot = { date: string; left: number; daysToGoal: number }

/** Spend the available minutes in order. A long practice step can span
 * sessions. A timed paper reserves one uninterrupted session separately. */
function schedule(activity: Activity, slots: Slot[]): PreparationStep | null {
  const available = slots.filter((slot) => slot.left > 0)
  if (available.reduce((sum, slot) => sum + slot.left, 0) < activity.minutes) return null
  let remaining = activity.minutes
  let endDate = available[0].date
  for (const slot of available) {
    const spent = Math.min(slot.left, remaining)
    slot.left -= spent
    remaining -= spent
    endDate = slot.date
    if (remaining === 0) break
  }
  const date = available[0].date
  return { ...activity, date, endDate: endDate === date ? undefined : endDate }
}

function makeSlots(input: Input, daysLeft: number, adaptedToday: boolean) {
  const start = dayTime(input.today)
  const slots: Slot[] = []
  for (let offset = 0; offset < Math.min(daysLeft, MAX_HORIZON); offset++) {
    const date = new Date(start + offset * DAY)
    if (!input.preferences.weekdays.includes(date.getUTCDay())) continue
    const daysToGoal = daysLeft - offset
    const cap = daysToGoal <= TAPER_DAYS ? Math.min(15, input.preferences.sessionMinutes) : input.preferences.sessionMinutes
    slots.push({
      date: asDate(date.getTime()),
      left: offset === 0 && adaptedToday ? Math.floor(cap / 2) : cap,
      daysToGoal,
    })
  }
  return slots
}

function makeMock(pool: CatalogueTask[], papers: RealPaper[], exact: (task: CatalogueTask) => boolean, minutes: number) {
  if (minutes < 15 || pool.length === 0) return null
  const byId = new Map(pool.map((task) => [task.id, task]))
  const paper = papers.find((entry) =>
    entry.durationMinutes <= minutes && entry.solved === 0 && entry.taskIds.every((id) => {
      const task = byId.get(id)
      return task && exact(task)
    }),
  )
  if (paper) return { title: paper.title, minutes: paper.durationMinutes, source: 'archive' as const,
    mock: { taskIds: paper.taskIds, fullPaper: true } }

  // Keep a short timed rehearsal possible even with a 15–30 minute session.
  // For a timebox shorter than one estimate, select one problem and label it.
  const taskIds: string[] = []
  const candidates = pool.filter((task) => !task.solved)
  const queue = candidates.length ? candidates : pool
  const selectedPaper = queue[0].paper
  const coherent = selectedPaper ? queue.filter((task) => task.paper === selectedPaper) : queue
  let used = 0
  for (const task of coherent) {
    const estimate = Math.max(1, task.estimatedMinutes ?? 25)
    if (taskIds.length >= 5) break
    if (used + estimate > minutes) continue
    taskIds.push(task.id)
    used += estimate
  }
  if (taskIds.length === 0) taskIds.push(queue[0].id)
  return {
    title: 'Timed practice',
    minutes: Math.max(15, used || minutes),
    source: taskIds.every((id) => exact(byId.get(id)!)) ? 'archive' as const : 'similar' as const,
    mock: { taskIds, fullPaper: false },
  }
}

export function buildPreparation(input: Input): PreparationPlan {
  const daysLeft = Math.max(0, Math.round((dayTime(input.targetDate) - dayTime(input.today)) / DAY) || 0)
  const { day } = input
  const adaptedToday = input.preferences.weekdays.includes(new Date(dayTime(input.today)).getUTCDay()) &&
    daysLeft > 0 && day.reported &&
    ((day.mental > 0 && day.mental <= 2) || (day.sleepHours > 0 && day.sleepHours < 6) || day.loadMinutes >= 480)
  const slots = makeSlots(input, daysLeft, adaptedToday)
  const preferredMinutes = slots.reduce((sum, slot) => sum + slot.left, 0)
  const grade = input.preferences.schoolGrade
  const range: [number, number] | null = grade ? [grade, grade] : gradeRange(input.grade)
  const prefix = input.competitionSlug && ARCHIVE[input.competitionSlug]
  const exact = (task: CatalogueTask) => Boolean(prefix && task.id.startsWith(prefix))
  const subjectTasks = input.tasks.filter((task) => task.subject === input.subject)
  const candidates = subjectTasks.filter((task) => fitsGrade(task, range))
  const hasArchive = candidates.some(exact)
  const level = input.competitionLevel === 'International' ? 5 : input.competitionLevel === 'National' ? 4 : 3
  const targetDifficulty = input.level === 'Getting started' ? level - 1 : level
  const byTopic = new Map<string, CatalogueTask[]>()
  const papers = realPapers(subjectTasks)
  const ranked = candidates.sort((a, b) =>
    Number(exact(b)) - Number(exact(a)) ||
    Number(a.solved) - Number(b.solved) ||
    Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty) ||
    Number(b.gradeMin !== null) - Number(a.gradeMin !== null) ||
    b.attempts - a.attempts || a.id.localeCompare(b.id),
  )
  for (const task of ranked) {
    const list = byTopic.get(task.topic) ?? []
    list.push(task)
    byTopic.set(task.topic, list)
  }
  const topics = [...input.topics].filter((topic) => byTopic.has(topic.name)).sort((a, b) =>
    Number((byTopic.get(b.name) ?? []).some(exact)) - Number((byTopic.get(a.name) ?? []).some(exact)) ||
    (a.mastery ?? 50) - (b.mastery ?? 50) ||
    a.position - b.position || a.slug.localeCompare(b.slug),
  )

  const taskActivity = (task: CatalogueTask): Activity => ({
    id: `task-${task.id}`, kind: 'task', title: task.title, topic: task.topic,
    href: `/tasks/${encodeURIComponent(task.id)}`, minutes: Math.max(1, task.estimatedMinutes ?? 25),
    source: exact(task) ? 'archive' : 'similar', completedAt: input.completedTasks.get(task.id),
  })
  const topicActivities = (topic: PreparationTopic): Activity[] => {
    const items: Activity[] = []
    if (topic.lesson) items.push({
      id: `lesson-${topic.lesson.id}`, kind: 'lesson', title: topic.lesson.title, topic: topic.name,
      href: `/learn/${topic.slug}/lesson`, minutes: topic.lesson.minutes,
      completedAt: topic.lesson.completedAt ?? undefined,
    })
    if (topic.quiz) items.push({
      id: `quiz-${topic.slug}`, kind: 'quiz', title: topic.name, topic: topic.name,
      href: `/learn/${topic.slug}/quiz`, minutes: topic.quiz.minutes,
      completedAt: topic.quiz.completedAt ?? undefined,
    })
    return items
  }

  const history = [
    ...input.topics.flatMap(topicActivities),
    ...subjectTasks.filter((task) => input.completedTasks.has(task.id)).map(taskActivity),
  ].filter((step) => step.completedAt && step.completedAt >= input.goalStart)
    .map((step) => ({ ...step, date: step.completedAt!.slice(0, 10) }))

  const usedMockTasks = new Set<string>()
  let openMock = false
  for (const mock of input.mocks) {
    mock.taskIds.forEach((id) => usedMockTasks.add(id))
    openMock ||= !mock.completedAt
    history.push({
      id: mock.key, kind: 'mock', title: 'Mock test', href: `/mock/${mock.id}`, minutes: mock.minutes,
      date: (mock.completedAt ?? mock.startedAt).slice(0, 10), completedAt: mock.completedAt ?? undefined,
    })
  }
  const todaySlot = slots.find((slot) => slot.date === input.today)
  if (todaySlot) {
    const spent = history.filter((step) => step.date === input.today).reduce((sum, step) => sum + step.minutes, 0)
    todaySlot.left = Math.max(0, todaySlot.left - spent)
  }

  const practice = slots.filter((slot) => slot.daysToGoal > TAPER_DAYS)
  const planned: PreparationStep[] = []
  const reserved = new Set<string>()
  // Rehearse in the final fortnight, with a study day afterwards for review.
  // Leave room for ordinary preparation when there are several sessions.
  const rehearsalDays = practice.filter((slot) => slot.daysToGoal <= CRUNCH_DAYS && slot.left >= 15)
  const count = rehearsalDays.length >= 6 ? 2 : rehearsalDays.length >= 1 ? 1 : 0
  const rehearsalSlots = count === 2
    ? [rehearsalDays[Math.floor(rehearsalDays.length / 3)], rehearsalDays[rehearsalDays.length - 2]]
    : rehearsalDays.slice(rehearsalDays.length > 1 ? -2 : -1).slice(0, count)

  if (!openMock) {
    const pendingKeys = ['mock-1', 'mock-2'].filter((key) => !input.mocks.some((mock) => mock.key === key))
    for (const slot of rehearsalSlots.slice(input.mocks.length)) {
      const blueprint = makeMock(ranked.filter((task) => !usedMockTasks.has(task.id) && !reserved.has(task.id)), papers, exact, slot.left)
      if (!blueprint) break
      const id = pendingKeys.shift()
      if (!id) break
      planned.push({ id, kind: 'mock', ...blueprint, date: slot.date })
      slot.left -= blueprint.minutes
      blueprint.mock.taskIds.forEach((taskId) => reserved.add(taskId))
    }
  }

  const byId = new Map(subjectTasks.map((task) => [task.id, task]))
  for (const mock of input.mocks) {
    if (!mock.completedAt) continue
    const missed = mock.missedTaskIds.map((id) => byId.get(id)).find(Boolean)
    if (!missed) continue
    const review: Activity = {
      id: `review-${mock.id}`, kind: 'review', title: missed.title, topic: missed.topic,
      minutes: 10, href: `/mock/${mock.id}`, completedAt: mock.reviewedAt ?? undefined,
    }
    if (review.completedAt) {
      history.push({ ...review, date: review.completedAt.slice(0, 10) })
    } else {
      const placed = schedule(review, slots)
      if (placed) planned.push(placed)
    }
  }

  let priorityOnly = false
  const taskQueues = topics.map((topic) => {
    const list = (byTopic.get(topic.name) ?? []).filter((task) => !task.solved && !reserved.has(task.id))
    // If this topic has competition problems, stay with that archive.
    return list.some(exact) ? list.filter(exact) : list
  })
  for (const [index, topic] of topics.entries()) {
    const queue = taskQueues[index]
    if (queue.length === 0) continue
    const first = queue[0]
    const steps = [...topicActivities(topic).filter((step) => !step.completedAt), taskActivity(first)]
    if (practice.reduce((sum, slot) => sum + slot.left, 0) < steps.reduce((sum, step) => sum + step.minutes, 0)) {
      priorityOnly = true
    }
    for (const step of steps) {
      const placed = schedule(step, practice)
      if (placed) planned.push(placed)
    }
    queue.shift()
  }
  // Round-robin subsequent practice so the largest topic does not eat the rest.
  while (practice.some((slot) => slot.left > 0) && taskQueues.some((queue) => queue.length > 0)) {
    for (const queue of taskQueues) {
      const task = queue.shift()
      if (!task) continue
      const step = schedule(taskActivity(task), practice)
      if (step) planned.push(step)
    }
  }

  return {
    steps: [...history.sort((a, b) => a.date.localeCompare(b.date)),
      ...planned.sort((a, b) => a.date.localeCompare(b.date))],
    preferredMinutes,
    scheduledMinutes: planned.reduce((sum, step) => sum + step.minutes, 0),
    daysLeft,
    hasArchive,
    hasMaterials: candidates.length > 0,
    adaptedToday,
    priorityOnly: priorityOnly || (practice.length === 0 && daysLeft > 0),
  }
}
