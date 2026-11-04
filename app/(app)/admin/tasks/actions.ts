'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminAction, type AdminResult } from '@/lib/supabase/admin-guard'
import { forgetReferenceContent } from '@/lib/supabase/reference'
import { getT } from '@/lib/i18n/server'
import { logAdmin } from '@/lib/admin/log'

const LEVELS = new Set(['oblast', 'republican', 'international'])

function int(value: FormDataEntryValue | null, min: number, max: number) {
  const number = Number(String(value ?? '').trim())
  return String(value ?? '').trim() && Number.isInteger(number) && number >= min && number <= max ? number : null
}

/** The catalogue is memoised per process; every write here must drop it. */
function refresh(id?: string) {
  forgetReferenceContent()
  revalidatePath('/admin/tasks')
  revalidatePath('/tasks', 'layout')
  revalidatePath('/mock')
  if (id) revalidatePath(`/admin/tasks/${id}`)
}

/**
 * Creates a problem (no id) or rewrites one. Everything a student sees and
 * the grader reads is here: the statement, the reference solution, the hints,
 * where it sits in the syllabus and which grades it is for.
 */
export async function saveTask(id: string | null, formData: FormData): Promise<AdminResult & { id?: string }> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate

  const title = String(formData.get('title') ?? '').trim().slice(0, 300)
  const problem = String(formData.get('problem') ?? '').trim().slice(0, 20_000)
  if (!title) return { ok: false, error: t('Give the problem a title.') }
  if (problem.length < 10) return { ok: false, error: t('Write the statement out in full.') }

  const topicId = String(formData.get('topic_id') ?? '')
  const { data: topic } = await gate.admin.from('topics').select('id, subject_id').eq('id', topicId).maybeSingle()
  if (!topic) return { ok: false, error: t('Choose a topic.') }

  const difficulty = int(formData.get('difficulty'), 1, 5)
  if (!difficulty) return { ok: false, error: t('Difficulty is 1 to 5.') }

  const gradeMin = int(formData.get('grade_min'), 1, 12)
  const gradeMax = int(formData.get('grade_max'), 1, 12)
  if ((gradeMin === null) !== (gradeMax === null) || (gradeMin && gradeMax && gradeMax < gradeMin)) {
    return { ok: false, error: t('Give both grades, the lower first, or neither.') }
  }
  const level = String(formData.get('level') ?? '')
  const hints = String(formData.get('hints') ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10)

  const row = {
    title,
    problem,
    subject_id: topic.subject_id,
    topic_id: topic.id,
    difficulty,
    official_solution: String(formData.get('official_solution') ?? '').trim().slice(0, 30_000) || null,
    hints,
    source: String(formData.get('source') ?? '').trim().slice(0, 200) || null,
    estimated_minutes: int(formData.get('estimated_minutes'), 1, 600),
    grade_min: gradeMin,
    grade_max: gradeMax,
    level: LEVELS.has(level) ? level : null,
    paper: String(formData.get('paper') ?? '').trim().slice(0, 80) || null,
    hidden: formData.get('hidden') === 'on',
  }

  if (id) {
    const { data, error } = await gate.admin.from('tasks').update(row).eq('id', id).is('class_id', null).select('id').maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: false, error: t('That problem no longer exists.') }
    await logAdmin(gate.admin, gate.userId, 'task.edit', id, { title })
    refresh(id)
    return { ok: true, message: t('Saved.'), id }
  }

  const newId = `admin-${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
  const { error } = await gate.admin
    .from('tasks')
    .insert({ id: newId, ...row, created_by: gate.userId, licence: 'original', attribution: null })
  if (error) return { ok: false, error: error.message }
  await logAdmin(gate.admin, gate.userId, 'task.create', newId, { title })
  refresh(newId)
  return { ok: true, message: t('Problem created.'), id: newId }
}

export async function setTaskHidden(id: string, hidden: boolean): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const { data, error } = await gate.admin.from('tasks').update({ hidden }).eq('id', id).select('id').maybeSingle()
  if (error || !data) return { ok: false, error: t('That problem could not be updated.') }
  await logAdmin(gate.admin, gate.userId, hidden ? 'task.hide' : 'task.show', id)
  refresh(id)
  return { ok: true, message: hidden ? t('Hidden from students.') : t('Students can see it again.') }
}

/**
 * Deletes a problem nobody has attempted. One with attempts is hidden
 * instead: deleting it would erase students' history and scores with it.
 */
export async function deleteTask(id: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const { count } = await gate.admin.from('task_attempts').select('id', { count: 'exact', head: true }).eq('task_id', id)
  if (count) return { ok: false, error: t('Students have attempted this problem. Hide it instead.') }
  const { data, error } = await gate.admin.from('tasks').delete().eq('id', id).select('title').maybeSingle()
  if (error || !data) return { ok: false, error: t('That problem could not be deleted.') }
  await logAdmin(gate.admin, gate.userId, 'task.delete', id, { title: data.title })
  refresh()
  return { ok: true, message: t('Deleted.') }
}
