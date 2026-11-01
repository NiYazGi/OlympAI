'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { normaliseCode } from '@/lib/supabase/classes'
import { getReference } from '@/lib/supabase/reference'
import { searchTopicTasks, type TrackPick } from '@/lib/supabase/track'
import { hasSupabaseSecretKey } from '@/lib/supabase/secret-env'
import { createClient } from '@/lib/supabase/server'

export type ClassResult = { ok: boolean; error?: string; classId?: string }

const MAX_NAME = 80
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * A fresh join code, in the same alphabet as public.gen_join_code(). The
 * database generates the first one; this generates the replacement, because an
 * update cannot ask a column default to run again.
 */
function newJoinCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return [...bytes].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('')
}

/** Every write here is checked against the authoritative user, not the claims. */
async function teacher() {
  const user = await getVerifiedUser()
  if (!user) return { error: 'Your session has expired. Please log in again.' as const }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'teacher') {
    return { error: 'Only a teacher account can do that.' as const }
  }
  return { id: user.id, supabase }
}

export async function createClass(formData: FormData): Promise<ClassResult> {
  const who = await teacher()
  if ('error' in who) return { ok: false, error: who.error }

  const name = String(formData.get('name') ?? '')
    .trim()
    .slice(0, MAX_NAME)
  if (!name) return { ok: false, error: 'Give the class a name.' }

  // A slug rather than an id, so the form cannot point a class at a row that
  // is not a subject. Empty means a class that covers both.
  const slug = String(formData.get('subject') ?? '')
  let subjectId: string | null = null
  if (slug) {
    const reference = await getReference()
    const subject = reference.subjects.find((row) => row.slug === slug)
    if (!subject) return { ok: false, error: 'That is not one of the subjects.' }
    subjectId = subject.id
  }

  const { data, error } = await who.supabase
    .from('classes')
    .insert({ teacher_id: who.id, name, subject_id: subjectId })
    .select('id')
    .single()
  if (error || !data) return { ok: false, error: 'The class could not be created.' }

  revalidatePath('/class')
  return { ok: true, classId: data.id }
}

export async function renameClass(formData: FormData): Promise<ClassResult> {
  const who = await teacher()
  if ('error' in who) return { ok: false, error: who.error }

  const classId = String(formData.get('class_id') ?? '')
  const name = String(formData.get('name') ?? '')
    .trim()
    .slice(0, MAX_NAME)
  if (!classId || !name) return { ok: false, error: 'Give the class a name.' }

  // RLS restricts the update to this teacher's own classes, so the id coming
  // from the form cannot reach anybody else's row.
  const { error } = await who.supabase.from('classes').update({ name }).eq('id', classId)
  if (error) return { ok: false, error: 'That could not be saved.' }

  revalidatePath('/class')
  revalidatePath(`/class/${classId}`)
  return { ok: true }
}

/**
 * Replaces the join code.
 *
 * An invite link is passed around in group chats and screenshots, and the only
 * way to take one back is to make it stop working. Students already in the
 * class are unaffected: the code admits, it does not hold.
 */
export async function rotateJoinCode(formData: FormData): Promise<ClassResult> {
  const who = await teacher()
  if ('error' in who) return { ok: false, error: who.error }

  const classId = String(formData.get('class_id') ?? '')
  if (!classId) return { ok: false, error: 'Which class?' }

  const { error } = await who.supabase
    .from('classes')
    .update({ join_code: newJoinCode() })
    .eq('id', classId)
  if (error) return { ok: false, error: 'The code could not be changed.' }

  revalidatePath(`/class/${classId}`)
  return { ok: true }
}

export async function removeStudent(formData: FormData): Promise<ClassResult> {
  const who = await teacher()
  if ('error' in who) return { ok: false, error: who.error }

  const classId = String(formData.get('class_id') ?? '')
  const studentId = String(formData.get('student_id') ?? '')
  if (!classId || !studentId) return { ok: false, error: 'Which student?' }

  const { error } = await who.supabase
    .from('class_members')
    .delete()
    .eq('class_id', classId)
    .eq('student_id', studentId)
  if (error) return { ok: false, error: 'They could not be removed.' }

  revalidatePath(`/class/${classId}`)
  return { ok: true }
}

/**
 * Deletes a class. The students' work is untouched — it was never the class's
 * to hold. What ends is the teacher's sight of it.
 */
export async function deleteClass(formData: FormData): Promise<ClassResult> {
  const who = await teacher()
  if ('error' in who) return { ok: false, error: who.error }

  const classId = String(formData.get('class_id') ?? '')
  if (!classId) return { ok: false, error: 'Which class?' }

  const { error } = await who.supabase.from('classes').delete().eq('id', classId)
  if (error) return { ok: false, error: 'The class could not be deleted.' }

  revalidatePath('/class')
  return { ok: true }
}

/**
 * Joins a class by its code.
 *
 * Written with the service role, like a grade is, and for the same kind of
 * reason: the authority here is the code, which a row-level policy cannot see.
 * RLS grants `authenticated` no insert on class_members at all, so a student
 * who learned a class id still cannot add themselves — the only way in is to
 * know six characters the teacher handed out.
 *
 * A teacher is refused: an account that watches should not also appear on a
 * roster as something to watch.
 */
export async function joinClass(formData: FormData): Promise<ClassResult> {
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }
  if (!hasSupabaseSecretKey()) {
    return { ok: false, error: 'Joining a class is not configured on this server.' }
  }

  const code = normaliseCode(String(formData.get('code') ?? ''))
  if (!code) return { ok: false, error: 'That is not a class code. Six letters and digits.' }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role === 'teacher') {
    return { ok: false, error: 'A teacher account cannot join a class as a student.' }
  }

  const admin = createAdminClient()
  const { data: found } = await admin
    .from('classes')
    .select('id, teacher_id')
    .eq('join_code', code)
    .maybeSingle()
  if (!found) return { ok: false, error: 'No class has that code. Check it with your teacher.' }
  if (found.teacher_id === user.id) {
    return { ok: false, error: 'That is your own class.' }
  }

  const { error } = await admin
    .from('class_members')
    .upsert(
      { class_id: found.id, student_id: user.id },
      { onConflict: 'class_id,student_id', ignoreDuplicates: true },
    )
  if (error) return { ok: false, error: 'You could not be added to the class.' }

  revalidatePath('/class')
  return { ok: true, classId: found.id }
}

/** Leaving is the student's own decision, and RLS lets them make it. */
export async function leaveClass(formData: FormData): Promise<ClassResult> {
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }

  const classId = String(formData.get('class_id') ?? '')
  if (!classId) return { ok: false, error: 'Which class?' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('class_members')
    .delete()
    .eq('class_id', classId)
    .eq('student_id', user.id)
  if (error) return { ok: false, error: 'You could not be removed from the class.' }

  revalidatePath('/class')
  return { ok: true }
}

/**
 * The order a class works through the sections, and how many problems each
 * one asks for.
 *
 * Sent whole rather than a row at a time: an order is one thing, and saving it
 * in pieces would leave a class half in the teacher's order and half in the
 * default while the requests landed.
 *
 * Only rows that differ from the syllabus are stored. A teacher who moves one
 * section has not taken responsibility for the other twelve, and the ones they
 * did not touch keep following the default — including when the default
 * changes.
 */
/** The most problems a teacher can hand-pick for one section. */
const MAX_PICKS = 100
const MAX_NOTE = 500

export async function saveTrack(formData: FormData): Promise<ClassResult> {
  const who = await teacher()
  if ('error' in who) return { ok: false, error: who.error }

  const classId = String(formData.get('class_id') ?? '')
  if (!classId) return { ok: false, error: 'Which class?' }

  let sent: unknown
  try {
    sent = JSON.parse(String(formData.get('track') ?? '[]'))
  } catch {
    return { ok: false, error: 'That track could not be read.' }
  }
  if (!Array.isArray(sent)) return { ok: false, error: 'That track could not be read.' }

  // Topic and task ids are checked against the reference rather than trusted:
  // this writes rows keyed by them, and a value from a form is not an id until
  // something says it is. A chosen problem must also be in the section it was
  // chosen for, or the route would ask for it under the wrong heading.
  const reference = await getReference()
  const known = new Map(reference.topics.map((topic) => [topic.id, topic]))
  const topicOfTask = new Map(reference.tasks.map((task) => [task.id, task.topic_id]))

  const sections: {
    topic_id: string
    position: number
    target: number | null
    skipped: boolean
    due_date: string | null
    note: string | null
  }[] = []
  const chosen: { topic_id: string; task_id: string; position: number }[] = []
  const seen = new Set<string>()

  for (const [index, entry] of sent.entries()) {
    if (typeof entry !== 'object' || entry === null) continue
    const { topicId, target, skipped, due, note, picks } = entry as Record<string, unknown>
    const topic = typeof topicId === 'string' ? known.get(topicId) : undefined
    if (!topic) continue

    const asked = typeof target === 'number' && Number.isFinite(target) ? Math.round(target) : null
    const position = index + 1
    const off = skipped === true
    // A real calendar date or nothing. "2026-02-30" parses in JavaScript as
    // 2 March, so the round trip is what decides.
    const dueDate =
      typeof due === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(due) &&
      new Date(`${due}T00:00:00Z`).toISOString().startsWith(due)
        ? due
        : null
    const text = typeof note === 'string' ? note.trim().slice(0, MAX_NOTE) : ''

    const ids = (Array.isArray(picks) ? picks : [])
      .filter((id): id is string => typeof id === 'string')
      .filter((id) => topicOfTask.get(id) === topic.id && !seen.has(id))
      .slice(0, MAX_PICKS)
    ids.forEach((id, n) => {
      seen.add(id)
      chosen.push({ topic_id: topic.id, task_id: id, position: n + 1 })
    })

    // Unchanged from the syllabus on every count means no row at all, so a
    // teacher who edits one section has not taken over the other twelve.
    if (position === topic.position && asked === null && !off && !dueDate && !text && !ids.length) {
      continue
    }
    sections.push({
      topic_id: topic.id,
      position,
      target: asked === null ? null : Math.max(0, Math.min(500, asked)),
      skipped: off,
      due_date: dueDate,
      note: text || null,
    })
  }

  // One transaction: the order and the chosen problems are one plan, and a
  // class left with half of it would be on a route nobody wrote.
  const { error } = await who.supabase.rpc('save_class_plan', {
    plan_class: classId,
    sections,
    chosen,
  })
  if (error) return { ok: false, error: 'The plan could not be saved.' }

  revalidatePath(`/class/${classId}`)
  // Every student in the class is now on a different route.
  revalidatePath('/tasks')
  revalidatePath('/plan')
  revalidatePath('/learn')
  revalidatePath('/dashboard')
  return { ok: true }
}

/**
 * Problems in one section a teacher can choose from, matching what they typed.
 *
 * Only for the teacher of the class, and only for a section of that class's
 * subject: the picker has no business listing anything else.
 */
export async function findTrackTasks(
  classId: string,
  topicId: string,
  query: string,
): Promise<{ ok: boolean; tasks: TrackPick[]; error?: string }> {
  const who = await teacher()
  if ('error' in who) return { ok: false, tasks: [], error: who.error }

  const { data: klass } = await who.supabase
    .from('classes')
    .select('subject_id')
    .eq('id', classId)
    .eq('teacher_id', who.id)
    .maybeSingle()
  if (!klass) return { ok: false, tasks: [], error: 'Which class?' }

  const reference = await getReference()
  const topic = reference.topics.find((entry) => entry.id === topicId)
  if (!topic || (klass.subject_id && topic.subject_id !== klass.subject_id)) {
    return { ok: false, tasks: [], error: 'That section is not in this class.' }
  }
  return { ok: true, tasks: await searchTopicTasks(topicId, query.slice(0, 120)) }
}
