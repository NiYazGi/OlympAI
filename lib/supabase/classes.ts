import 'server-only'

import { cache } from 'react'
import { getSessionUserId } from '@/lib/supabase/auth'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { hasSupabaseSecretKey } from '@/lib/supabase/secret-env'
import { getReference } from '@/lib/supabase/reference'
import { createClient } from '@/lib/supabase/server'
import { readiness, type Readiness } from '@/lib/goal'
import { buildPath, type Track } from '@/lib/path'
import { getClassPlan } from '@/lib/supabase/track'
import type { CatalogueTask } from '@/lib/types'

/**
 * The teacher's side of the app.
 *
 * Every read here goes through the caller's own session, so RLS decides what
 * comes back: the policies added in migration 43 let a teacher select the work
 * of students in their own classes and nothing else. A teacher who is not this
 * class's teacher gets an empty roster from the database rather than from an
 * `if` in a page that could be forgotten.
 *
 * The numbers are computed the same way the student's own dashboard computes
 * them — accuracy over attempts, mastery per topic, readiness from the path —
 * because a teacher and a student looking at the same student should not be
 * reading two different figures.
 */

export type ClassSummary = {
  id: string
  name: string
  subjectName: string | null
  joinCode: string
  studentCount: number
  createdAt: string
}

export type TopicScore = { topic: string; accuracy: number; attempts: number }

export type StudentRow = {
  id: string
  name: string | null
  joinedAt: string
  attempts: number
  /** Distinct problems answered correctly at least once. */
  solved: number
  /** Correct attempts over all attempts, or null before the first one. */
  accuracy: number | null
  /** The last sign of work of any kind. Null for a student who has not started. */
  lastActiveAt: string | null
  /** Lowest accuracy first, over topics with at least three attempts. */
  weakest: TopicScore[]
  quizAnswers: number
  lessonsRead: number
  papers: number
  bestPaper: number | null
  /** Against the class's subject, so one column means one thing. */
  readiness: Readiness | null
}

export type ClassDetail = ClassSummary & {
  /** The subject's id, for the sections a class's own problem can go under. */
  subjectId: string | null
  students: StudentRow[]
  /** Where the class as a whole is weakest. Worst first. */
  weakTopics: TopicScore[]
  totals: {
    attempts: number
    solved: number
    accuracy: number | null
    /** Students with any activity in the last seven days. */
    activeThisWeek: number
  }
}

/** A class as a student sees it: who runs it, and nothing about the others. */
export type Membership = {
  id: string
  name: string
  subjectName: string | null
  teacherName: string | null
  joinedAt: string
}

const WEEK_MS = 7 * 86_400_000
/** Below this an accuracy is noise, not a weakness. */
const MIN_ATTEMPTS_FOR_WEAKNESS = 3

/** Null rather than 0 for "no attempts yet": the two are not the same number. */
function accuracyOf(correct: number, attempts: number): number | null {
  return attempts > 0 ? Math.round((correct / attempts) * 100) : null
}

function laterOf(a: string | null, b: string | null | undefined): string | null {
  if (!b) return a
  if (!a) return b
  return b > a ? b : a
}

/** The classes this teacher runs, with a roster count and nothing heavier. */
export const getTeacherClasses = cache(async (): Promise<ClassSummary[]> => {
  if (!hasSupabaseEnv()) return []
  const teacherId = await getSessionUserId()
  if (!teacherId) return []

  const supabase = await createClient()
  const [{ data: classes }, reference] = await Promise.all([
    supabase
      .from('classes')
      .select('id, name, subject_id, join_code, created_at')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false }),
    getReference(),
  ])
  if (!classes?.length) return []

  const { data: members } = await supabase
    .from('class_members')
    .select('class_id')
    .in(
      'class_id',
      classes.map((row) => row.id),
    )

  const counts = new Map<string, number>()
  for (const row of members ?? []) counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1)

  return classes.map((row) => ({
    id: row.id,
    name: row.name,
    subjectName: row.subject_id ? (reference.subjectById[row.subject_id] ?? null) : null,
    joinCode: row.join_code,
    studentCount: counts.get(row.id) ?? 0,
    createdAt: row.created_at,
  }))
})

/**
 * One class, with every student's work in it.
 *
 * Six queries rather than six per student: the roster is fetched once, and
 * each table is then read for the whole roster at a time. A class of thirty is
 * the same number of round trips as a class of one.
 */
export const getClassDetail = cache(async (classId: string): Promise<ClassDetail | null> => {
  if (!hasSupabaseEnv()) return null
  const supabase = await createClient()

  const { data: row } = await supabase
    .from('classes')
    .select('id, name, subject_id, join_code, created_at')
    .eq('id', classId)
    .maybeSingle()
  if (!row) return null

  // The class's own plan, so the teacher's readiness column is measured
  // against the route they wrote and not the default one.
  const [reference, plan] = await Promise.all([getReference(), getClassPlan(classId)])
  const subjectName = row.subject_id ? (reference.subjectById[row.subject_id] ?? null) : null

  const base: ClassDetail = {
    id: row.id,
    name: row.name,
    subjectId: row.subject_id,
    subjectName,
    joinCode: row.join_code,
    createdAt: row.created_at,
    studentCount: 0,
    students: [],
    weakTopics: [],
    totals: { attempts: 0, solved: 0, accuracy: null, activeThisWeek: 0 },
  }

  const { data: members } = await supabase
    .from('class_members')
    .select('student_id, joined_at')
    .eq('class_id', classId)
    .order('joined_at')
  if (!members?.length) return base

  const ids = members.map((member) => member.student_id)
  const [profiles, attempts, quiz, reading, papers] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', ids),
    supabase
      .from('task_attempts')
      .select('user_id, task_id, is_correct, score, created_at')
      .in('user_id', ids)
      .order('created_at', { ascending: false }),
    supabase.from('quiz_attempts').select('user_id, created_at').in('user_id', ids),
    supabase.from('lesson_views').select('user_id, opened_at, completed_at').in('user_id', ids),
    supabase
      .from('mock_tests')
      .select('user_id, score_percent, submitted_at')
      .in('user_id', ids)
      .not('submitted_at', 'is', null),
  ])

  const nameById = new Map((profiles.data ?? []).map((p) => [p.id, p.full_name]))
  const taskById = new Map(reference.tasks.map((task) => [task.id, task]))
  const topicOf = (taskId: string) => {
    const task = taskById.get(taskId)
    return task ? (reference.topicById[task.topic_id] ?? null) : null
  }

  // Per student, and for the class at once.
  type Bucket = {
    attempts: number
    correct: number
    solved: Set<string>
    lastActiveAt: string | null
    byTopic: Map<string, { attempts: number; correct: number }>
    quiz: number
    reading: number
    papers: number
    bestPaper: number | null
  }
  const fresh = (): Bucket => ({
    attempts: 0,
    correct: 0,
    solved: new Set(),
    lastActiveAt: null,
    byTopic: new Map(),
    quiz: 0,
    reading: 0,
    papers: 0,
    bestPaper: null,
  })
  const buckets = new Map<string, Bucket>(ids.map((id) => [id, fresh()]))
  const classTopics = new Map<string, { attempts: number; correct: number }>()
  // Which problems each student has answered correctly, for their readiness.
  const solvedByStudent = new Map<string, Set<string>>(ids.map((id) => [id, new Set()]))

  for (const attempt of attempts.data ?? []) {
    const bucket = buckets.get(attempt.user_id)
    if (!bucket) continue
    bucket.attempts += 1
    bucket.correct += attempt.is_correct ? 1 : 0
    bucket.lastActiveAt = laterOf(bucket.lastActiveAt, attempt.created_at)
    if (attempt.is_correct) {
      bucket.solved.add(attempt.task_id)
      solvedByStudent.get(attempt.user_id)?.add(attempt.task_id)
    }

    const topic = topicOf(attempt.task_id)
    if (!topic) continue
    const mine = bucket.byTopic.get(topic) ?? { attempts: 0, correct: 0 }
    mine.attempts += 1
    mine.correct += attempt.is_correct ? 1 : 0
    bucket.byTopic.set(topic, mine)

    const ours = classTopics.get(topic) ?? { attempts: 0, correct: 0 }
    ours.attempts += 1
    ours.correct += attempt.is_correct ? 1 : 0
    classTopics.set(topic, ours)
  }

  for (const answer of quiz.data ?? []) {
    const bucket = buckets.get(answer.user_id)
    if (!bucket) continue
    bucket.quiz += 1
    bucket.lastActiveAt = laterOf(bucket.lastActiveAt, answer.created_at)
  }

  for (const view of reading.data ?? []) {
    const bucket = buckets.get(view.user_id)
    if (!bucket) continue
    if (view.completed_at) bucket.reading += 1
    bucket.lastActiveAt = laterOf(bucket.lastActiveAt, view.completed_at ?? view.opened_at)
  }

  for (const paper of papers.data ?? []) {
    const bucket = buckets.get(paper.user_id)
    if (!bucket) continue
    bucket.papers += 1
    if (paper.score_percent !== null) {
      bucket.bestPaper = Math.max(bucket.bestPaper ?? 0, paper.score_percent)
    }
  }

  const since = new Date(Date.now() - WEEK_MS).toISOString()
  const students: StudentRow[] = members.map((member) => {
    const bucket = buckets.get(member.student_id) ?? fresh()
    const weakest = [...bucket.byTopic]
      .filter(([, value]) => value.attempts >= MIN_ATTEMPTS_FOR_WEAKNESS)
      .map(([topic, value]) => ({
        topic,
        attempts: value.attempts,
        accuracy: Math.round((value.correct / value.attempts) * 100),
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 2)

    return {
      id: member.student_id,
      name: nameById.get(member.student_id) ?? null,
      joinedAt: member.joined_at,
      attempts: bucket.attempts,
      solved: bucket.solved.size,
      accuracy: accuracyOf(bucket.correct, bucket.attempts),
      lastActiveAt: bucket.lastActiveAt,
      weakest,
      quizAnswers: bucket.quiz,
      lessonsRead: bucket.reading,
      papers: bucket.papers,
      bestPaper: bucket.bestPaper,
      readiness: subjectName
        ? readinessFor(reference, solvedByStudent.get(member.student_id) ?? new Set(), subjectName,
            accuracyOf(bucket.correct, bucket.attempts), plan)
        : null,
    }
  })

  const totalAttempts = students.reduce((sum, student) => sum + student.attempts, 0)
  const totalCorrect = [...buckets.values()].reduce((sum, bucket) => sum + bucket.correct, 0)

  return {
    ...base,
    studentCount: students.length,
    students,
    weakTopics: [...classTopics]
      .filter(([, value]) => value.attempts >= MIN_ATTEMPTS_FOR_WEAKNESS)
      .map(([topic, value]) => ({
        topic,
        attempts: value.attempts,
        accuracy: Math.round((value.correct / value.attempts) * 100),
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 4),
    totals: {
      attempts: totalAttempts,
      solved: students.reduce((sum, student) => sum + student.solved, 0),
      accuracy: accuracyOf(totalCorrect, totalAttempts),
      activeThisWeek: students.filter(
        (student) => student.lastActiveAt && student.lastActiveAt >= since,
      ).length,
    },
  }
})

/**
 * The readiness ring the student sees on their own plan, recomputed from the
 * class's subject. It is the same function and the same path, so the teacher's
 * column and the student's ring cannot drift apart.
 */
function readinessFor(
  reference: Awaited<ReturnType<typeof getReference>>,
  solved: Set<string>,
  subjectName: string,
  accuracy: number | null,
  plan: Track,
): Readiness | null {
  const tasks: CatalogueTask[] = reference.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    subject: reference.subjectById[task.subject_id] ?? 'General',
    topic: reference.topicById[task.topic_id] ?? 'General practice',
    topicPosition: reference.topicPositionById[task.topic_id] ?? 99,
    level: task.level,
    paper: task.paper,
    difficulty: task.difficulty,
    estimatedMinutes: task.estimated_minutes,
    source: task.source,
    solved: solved.has(task.id),
    attempts: 0,
  }))
  const path = buildPath(tasks, subjectName, plan)
  if (path.totalTasks === 0) return null
  return readiness(path, accuracy)
}

export type StudentDetail = {
  class: { id: string; name: string; subjectName: string | null }
  student: StudentRow
  /** Every topic they have attempted, weakest first. */
  topics: TopicScore[]
  /** The last few submissions, newest first. */
  recent: { taskId: string; title: string; topic: string | null; score: number; isCorrect: boolean; at: string }[]
}

/** One student, in depth. Read through the class so the policy still applies. */
export const getStudentDetail = cache(
  async (classId: string, studentId: string): Promise<StudentDetail | null> => {
    const detail = await getClassDetail(classId)
    if (!detail) return null
    const student = detail.students.find((row) => row.id === studentId)
    if (!student) return null

    const [supabase, reference] = await Promise.all([createClient(), getReference()])
    const { data: attempts } = await supabase
      .from('task_attempts')
      .select('task_id, is_correct, score, created_at')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })

    const taskById = new Map(reference.tasks.map((task) => [task.id, task]))
    const byTopic = new Map<string, { attempts: number; correct: number }>()
    for (const attempt of attempts ?? []) {
      const task = taskById.get(attempt.task_id)
      const topic = task ? (reference.topicById[task.topic_id] ?? null) : null
      if (!topic) continue
      const current = byTopic.get(topic) ?? { attempts: 0, correct: 0 }
      current.attempts += 1
      current.correct += attempt.is_correct ? 1 : 0
      byTopic.set(topic, current)
    }

    return {
      class: { id: detail.id, name: detail.name, subjectName: detail.subjectName },
      student,
      topics: [...byTopic]
        .map(([topic, value]) => ({
          topic,
          attempts: value.attempts,
          accuracy: Math.round((value.correct / value.attempts) * 100),
        }))
        .sort((a, b) => a.accuracy - b.accuracy),
      recent: (attempts ?? []).slice(0, 8).map((attempt) => {
        const task = taskById.get(attempt.task_id)
        return {
          taskId: attempt.task_id,
          title: task?.title ?? attempt.task_id,
          topic: task ? (reference.topicById[task.topic_id] ?? null) : null,
          score: attempt.score,
          isCorrect: attempt.is_correct,
          at: attempt.created_at,
        }
      }),
    }
  },
)

/** The classes the signed-in student has joined. */
export const getMemberships = cache(async (): Promise<Membership[]> => {
  if (!hasSupabaseEnv()) return []
  const studentId = await getSessionUserId()
  if (!studentId) return []

  const supabase = await createClient()
  const { data: members } = await supabase
    .from('class_members')
    .select('class_id, joined_at')
    .eq('student_id', studentId)
  if (!members?.length) return []

  const ids = members.map((member) => member.class_id)
  const [{ data: classes }, reference] = await Promise.all([
    supabase.from('classes').select('id, name, subject_id, teacher_id').in('id', ids),
    getReference(),
  ])
  if (!classes?.length) return []

  // Who can see their work is the one thing a student needs to know about
  // their teacher, and the policy that lets a teacher read their students does
  // not run in reverse — a student's own session returns nothing here.
  //
  // So the name is read with the service role, like the one on an invite page,
  // and only the name leaves this function. The alternative was a policy
  // opening a teacher's whole profile row to every student they teach, to show
  // one field.
  const teacherName = new Map<string, string | null>()
  if (hasSupabaseSecretKey()) {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { data: teachers } = await createAdminClient()
      .from('profiles')
      .select('id, full_name')
      .in(
        'id',
        classes.map((row) => row.teacher_id),
      )
    for (const row of teachers ?? []) teacherName.set(row.id, row.full_name)
  }
  const joinedAt = new Map(members.map((member) => [member.class_id, member.joined_at]))

  return classes.map((row) => ({
    id: row.id,
    name: row.name,
    subjectName: row.subject_id ? (reference.subjectById[row.subject_id] ?? null) : null,
    teacherName: teacherName.get(row.teacher_id) ?? null,
    joinedAt: joinedAt.get(row.id) ?? '',
  }))
})

/** A class by its join code, for the invite page. Name and teacher only. */
export async function getClassByCode(
  code: string,
): Promise<{ id: string; name: string; teacherName: string | null; subjectName: string | null } | null> {
  if (!hasSupabaseEnv()) return null
  const normalised = normaliseCode(code)
  if (!normalised) return null

  // Through the service role, because the invited student is not a member yet
  // and so cannot read the row they are being invited to. Nothing but the
  // class's name, subject and teacher leaves this function.
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: row } = await admin
    .from('classes')
    .select('id, name, subject_id, teacher_id')
    .eq('join_code', normalised)
    .maybeSingle()
  if (!row) return null

  const [{ data: teacher }, reference] = await Promise.all([
    admin.from('profiles').select('full_name').eq('id', row.teacher_id).maybeSingle(),
    getReference(),
  ])

  return {
    id: row.id,
    name: row.name,
    teacherName: teacher?.full_name ?? null,
    subjectName: row.subject_id ? (reference.subjectById[row.subject_id] ?? null) : null,
  }
}

/**
 * A code as a person will type it: lower case, with spaces or dashes in it
 * because that is how codes get written down. Returns null if what is left is
 * not six characters of the alphabet the generator uses.
 */
export function normaliseCode(raw: string): string | null {
  const value = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(value) ? value : null
}
