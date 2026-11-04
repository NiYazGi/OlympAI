import type { CatalogueTask } from '@/lib/types'

export type PathTask = {
  id: string
  title: string
  difficulty: number
  estimatedMinutes: number | null
  solved: boolean
  attempts: number
}

export type PathStage = {
  topic: string
  /** Every problem in the topic, easiest first. */
  tasks: PathTask[]
  solved: number
  total: number
  /** How many of them this track asks for. */
  target: number
  /** Progress towards the target, 0-100. */
  percent: number
  state: 'done' | 'current' | 'locked'
  /** The problems still to do for the target, in the order to do them. */
  todo: PathTask[]
  /** First unsolved problem in the stage, if the stage is open. */
  next: PathTask | null
  /** True when the teacher chose this section's problems by hand. */
  chosen: boolean
  /** The date the teacher wants the section finished by (YYYY-MM-DD). */
  due: string | null
  /** What the teacher wants the class to know about the section. */
  note: string | null
}

export type LearningPath = {
  subject: string | null
  stages: PathStage[]
  /**
   * Sections too thin to be a stage, with what they hold.
   *
   * Not hidden — a student should know the section exists and that there is
   * almost nothing in it — but not part of the route either. See MIN_STAGE.
   */
  thin: { topic: string; total: number }[]
  /** Sections the class's teacher has taken out of the route. */
  skipped: string[]
  /** Problems the track asks for, across every topic. */
  totalTasks: number
  solvedTasks: number
  percent: number
  /** Everything in the subject, whether the track asks for it or not. */
  libraryTasks: number
  /** The single problem to open right now, across the whole path. */
  next: PathTask | null
}

/**
 * A teacher's plan for one class, by topic name: its place and its quota, and
 * since migration 48 whether it is in the route at all, the problems the
 * teacher chose for it, when it is due and a note.
 */
export type TrackEntry = {
  position: number
  target: number | null
  skipped?: boolean
  /** Task ids, in the order the teacher wants them solved. */
  picks?: string[]
  due?: string | null
  note?: string | null
}
export type Track = Map<string, TrackEntry>

/** A stage opens once most of the one before it is behind you. */
const UNLOCK_THRESHOLD = 0.6

/**
 * How many problems a topic asks for when nobody has said otherwise.
 *
 * The number is the whole difference between a route and a library. Algebra
 * holds 659 problems; "clear algebra" is a track nobody finishes and a student
 * who never reaches geometry. Eight is a fortnight of evenings on one topic,
 * eleven topics is a season, and a teacher can set their own per topic for
 * their class.
 *
 * A topic with fewer problems than this asks for what it has.
 */
export const DEFAULT_TARGET = 8

/**
 * Below this a section is not a stage.
 *
 * Statics holds one problem and Conservation Laws holds one. As stages they
 * were absurd in both directions: they cleared on the first solve, which made
 * the gate after them meaningless, and they took a week of the plan each,
 * which made the plan meaningless. A route made of eight-problem sections and
 * one-problem sections is not a route, it is a list of what happened to be
 * imported.
 *
 * They stay visible and solvable. What they stop doing is pretending to be a
 * stage of a course.
 */
export const MIN_STAGE = 3

/**
 * Builds an ordered route through one subject.
 *
 * Stage order used to be the mean difficulty of each topic's problems. That
 * made the syllabus a property of the import: fourteen invariants problems
 * averaging 2.79 put them ahead of geometry, and every new batch reshuffled
 * the subject. The order is a column now (`topics.position`, migration 44),
 * and a class may replace it.
 *
 * Within a topic the problems run easiest first, which is the one ordering a
 * student can act on.
 */
export function buildPath(
  tasks: CatalogueTask[],
  subject: string | null,
  track?: Track,
): LearningPath {
  const scoped = subject ? tasks.filter((task) => task.subject === subject) : tasks
  if (scoped.length === 0) {
    return {
      subject,
      stages: [],
      thin: [],
      skipped: [],
      totalTasks: 0,
      solvedTasks: 0,
      percent: 0,
      libraryTasks: 0,
      next: null,
    }
  }

  const byTopic = new Map<string, CatalogueTask[]>()
  for (const task of scoped) {
    const list = byTopic.get(task.topic) ?? []
    list.push(task)
    byTopic.set(task.topic, list)
  }

  const placeOf = (topic: string, list: CatalogueTask[]) =>
    track?.get(topic)?.position ?? list[0]?.topicPosition ?? 99

  const ordered = [...byTopic.entries()].sort(([aName, a], [bName, b]) => {
    const diff = placeOf(aName, a) - placeOf(bName, b)
    // Stable across renders when two topics share a place.
    return diff !== 0 ? diff : aName.localeCompare(bName)
  })

  // A section the teacher skipped is not in the route, however much it holds.
  const skipped = ordered.filter(([topic]) => track?.get(topic)?.skipped).map(([topic]) => topic)
  const routed = ordered.filter(([topic]) => !track?.get(topic)?.skipped)
  // Chosen problems make a stage whatever the section holds: a teacher who
  // picked two statics problems has said statics is a step of their course.
  const picked = (topic: string) => (track?.get(topic)?.picks?.length ?? 0) > 0

  const thin = routed
    .filter(([topic, list]) => list.length < MIN_STAGE && !picked(topic))
    .map(([topic, list]) => ({ topic, total: list.length }))
  const substantial = routed.filter(([topic, list]) => list.length >= MIN_STAGE || picked(topic))

  let previousCleared = true
  const stages: PathStage[] = substantial.map(([topic, list]) => {
    const tasks = list
      .map((task) => ({
        id: task.id,
        title: task.title,
        difficulty: task.difficulty,
        estimatedMinutes: task.estimatedMinutes,
        solved: task.solved,
        attempts: task.attempts,
      }))
      .sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title))

    const entry = track?.get(topic)
    // The teacher's problems, in the teacher's order, when there are any —
    // otherwise the section's own, easiest first. Ids that no longer resolve
    // (a problem withdrawn from the library) are dropped rather than counted.
    const byId = new Map(tasks.map((task) => [task.id, task]))
    const chosen = (entry?.picks ?? []).flatMap((id) => byId.get(id) ?? [])
    const route = chosen.length ? chosen : tasks

    const asked = entry?.target ?? (chosen.length ? chosen.length : DEFAULT_TARGET)
    const target = Math.max(1, Math.min(asked, route.length))
    const solved = route.filter((task) => task.solved).length
    const percent = Math.min(100, Math.round((solved / target) * 100))
    const state: PathStage['state'] =
      solved >= target ? 'done' : previousCleared ? 'current' : 'locked'

    // Evaluated after this stage's own state, so the gate reflects the stage
    // before it rather than itself.
    previousCleared = solved / target >= UNLOCK_THRESHOLD

    const unsolved = route.filter((task) => !task.solved)
    return {
      topic,
      tasks,
      solved,
      total: tasks.length,
      target,
      percent,
      state,
      todo: unsolved.slice(0, Math.max(0, target - solved)),
      next: state === 'locked' ? null : (unsolved[0] ?? null),
      chosen: chosen.length > 0,
      due: entry?.due ?? null,
      note: entry?.note ?? null,
    }
  })

  // The route is measured against what it asks for, not against the library.
  // Counting 1625 mathematics problems as the denominator made every student
  // 1% ready for ever.
  const totalTasks = stages.reduce((sum, stage) => sum + stage.target, 0)
  const solvedTasks = stages.reduce((sum, stage) => sum + Math.min(stage.solved, stage.target), 0)

  return {
    subject,
    stages,
    thin,
    skipped,
    totalTasks,
    solvedTasks,
    percent: totalTasks === 0 ? 0 : Math.round((solvedTasks / totalTasks) * 100),
    libraryTasks: scoped.length,
    next: stages.find((stage) => stage.state === 'current')?.next ?? null,
  }
}
