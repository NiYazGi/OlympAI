import 'server-only'

import { cache } from 'react'
import { getSessionUserId } from '@/lib/supabase/auth'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { getReference } from '@/lib/supabase/reference'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_TARGET, type Track } from '@/lib/path'

/**
 * Whose order a student is following.
 *
 * Every student has a route: the syllabus in `topics.position`. A student in a
 * class follows their teacher's instead, if the teacher has set one. The
 * distinction is worth carrying to the screen — "your teacher put geometry
 * third" is a different sentence from "this is the default order", and a
 * student who cannot tell them apart cannot ask about either.
 */
export type StudentTrack = {
  track: Track
  /** The class the order came from, when it came from one. */
  from: { id: string; name: string; teacherName: string | null } | null
}

const NO_TRACK: StudentTrack = { track: new Map(), from: null }

/**
 * One row per topic a teacher has moved or re-targeted.
 *
 * Keyed by topic name rather than id because that is what a built path has:
 * `buildPath` groups the catalogue by the name it displays.
 */
async function rowsFor(classId: string): Promise<Track> {
  const [supabase, reference] = await Promise.all([createClient(), getReference()])
  const [{ data }, { data: chosen }] = await Promise.all([
    supabase
      .from('class_tracks')
      .select('topic_id, position, target, skipped, due_date, note')
      .eq('class_id', classId)
      .order('position'),
    supabase
      .from('class_track_tasks')
      .select('topic_id, task_id, position')
      .eq('class_id', classId)
      .order('position'),
  ])

  const picks = new Map<string, string[]>()
  for (const row of chosen ?? []) {
    picks.set(row.topic_id, [...(picks.get(row.topic_id) ?? []), row.task_id])
  }

  const track: Track = new Map()
  for (const row of data ?? []) {
    const name = reference.topicById[row.topic_id]
    if (!name) continue
    track.set(name, {
      position: row.position,
      target: row.target,
      skipped: row.skipped,
      due: row.due_date,
      note: row.note,
      picks: picks.get(row.topic_id) ?? [],
    })
  }
  return track
}

/** A class's plan as its students' routes are built from it. */
export const getClassPlan = cache(rowsFor)

/**
 * The track the signed-in student is on.
 *
 * A student in more than one class follows the one they joined first: an order
 * is a sequence, and merging two of them would produce a third that neither
 * teacher wrote.
 */
export const getStudentTrack = cache(async (): Promise<StudentTrack> => {
  if (!hasSupabaseEnv()) return NO_TRACK
  const studentId = await getSessionUserId()
  if (!studentId) return NO_TRACK

  const supabase = await createClient()
  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id, joined_at')
    .eq('student_id', studentId)
    .order('joined_at')
  if (!memberships?.length) return NO_TRACK

  for (const membership of memberships) {
    const track = await rowsFor(membership.class_id)
    if (track.size === 0) continue

    const { data: klass } = await supabase
      .from('classes')
      .select('id, name, teacher_id')
      .eq('id', membership.class_id)
      .maybeSingle()
    if (!klass) continue

    // The teacher's name is read with the service role for the same reason as
    // in getMemberships: no policy lets a student read their teacher's row,
    // and opening one to show a name would be a wide answer to a narrow need.
    let teacherName: string | null = null
    const { hasSupabaseSecretKey } = await import('@/lib/supabase/secret-env')
    if (hasSupabaseSecretKey()) {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const { data: teacher } = await createAdminClient()
        .from('profiles')
        .select('full_name')
        .eq('id', klass.teacher_id)
        .maybeSingle()
      teacherName = teacher?.full_name ?? null
    }

    return { track, from: { id: klass.id, name: klass.name, teacherName } }
  }

  return NO_TRACK
})

export type TrackRow = {
  topicId: string
  topic: string
  slug: string
  /** Where it sits now: the class's own order, or the syllabus default. */
  position: number
  /** How many problems it asks for; null means the default. */
  target: number | null
  /** Problems in the library for this topic. */
  available: number
  /** True when the teacher has changed anything about this topic. */
  edited: boolean
  skipped: boolean
  /** YYYY-MM-DD, or null for "at the student's pace". */
  due: string | null
  note: string | null
  /** The problems the teacher chose, in their order. Empty: the easiest N. */
  picks: TrackPick[]
}

export type TrackPick = { id: string; title: string; difficulty: number; level: string | null }

/**
 * The problems of one topic a teacher can choose from, for the picker.
 *
 * Searched on the server rather than shipped whole: algebra holds 659
 * problems, and the editor would carry every one of them into the page for a
 * teacher who wants twelve.
 */
export async function searchTopicTasks(topicId: string, query: string, limit = 40): Promise<TrackPick[]> {
  const reference = await getReference()
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return reference.tasks
    .filter((task) => task.topic_id === topicId)
    .filter((task) => {
      if (!words.length) return true
      const haystack = `${task.title} ${task.source ?? ''} ${task.problem.slice(0, 400)}`.toLowerCase()
      return words.every((word) => haystack.includes(word))
    })
    .sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map((task) => ({ id: task.id, title: task.title, difficulty: task.difficulty, level: task.level }))
}

/**
 * The track as a teacher edits it: every topic of the class's subject, in the
 * order it currently runs, with what the class has asked of each.
 *
 * A class with no subject gets both subjects' topics, because that is what its
 * students are working through.
 */
export const getClassTrack = cache(async (classId: string): Promise<TrackRow[]> => {
  if (!hasSupabaseEnv()) return []

  const [supabase, reference] = await Promise.all([createClient(), getReference()])
  const { data: klass } = await supabase
    .from('classes')
    .select('subject_id')
    .eq('id', classId)
    .maybeSingle()
  if (!klass) return []

  const [{ data: rows }, { data: chosen }] = await Promise.all([
    supabase
      .from('class_tracks')
      .select('topic_id, position, target, skipped, due_date, note')
      .eq('class_id', classId),
    supabase
      .from('class_track_tasks')
      .select('topic_id, task_id, position')
      .eq('class_id', classId)
      .order('position'),
  ])
  const edited = new Map((rows ?? []).map((row) => [row.topic_id, row]))

  const counts = new Map<string, number>()
  const taskById = new Map<string, TrackPick>()
  for (const task of reference.tasks) {
    counts.set(task.topic_id, (counts.get(task.topic_id) ?? 0) + 1)
    taskById.set(task.id, { id: task.id, title: task.title, difficulty: task.difficulty, level: task.level })
  }
  const picks = new Map<string, TrackPick[]>()
  for (const row of chosen ?? []) {
    const task = taskById.get(row.task_id)
    if (task) picks.set(row.topic_id, [...(picks.get(row.topic_id) ?? []), task])
  }

  return reference.topics
    .filter((topic) => !klass.subject_id || topic.subject_id === klass.subject_id)
    .map((topic) => {
      const row = edited.get(topic.id)
      return {
        topicId: topic.id,
        topic: topic.name,
        slug: topic.slug,
        position: row?.position ?? topic.position,
        target: row?.target ?? null,
        available: counts.get(topic.id) ?? 0,
        edited: Boolean(row),
        skipped: row?.skipped ?? false,
        due: row?.due_date ?? null,
        note: row?.note ?? null,
        picks: picks.get(topic.id) ?? [],
      }
    })
    .sort((a, b) => a.position - b.position || a.topic.localeCompare(b.topic))
})

export { DEFAULT_TARGET }
