'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminAction, type AdminResult } from '@/lib/supabase/admin-guard'
import { getT } from '@/lib/i18n/server'
import { logAdmin } from '@/lib/admin/log'
import { deleteClassFolder } from '@/lib/class-files'

/** Attempts, classes and the site-wide switches. */

const DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Sets an attempt's score by hand. Mastery, XP and the path are all derived
 * from task_attempts, so this corrects everything built on the wrong score.
 */
export async function rescoreAttempt(id: string, score: number): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const value = Math.round(score)
  if (!Number.isFinite(value) || value < 0 || value > 100) return { ok: false, error: t('A score is a whole number from 0 to 100.') }

  const { data, error } = await gate.admin
    .from('task_attempts')
    .update({ score: value, is_correct: value >= 85, graded_by: 'admin' })
    .eq('id', id)
    .select('id, user_id')
    .maybeSingle()
  if (error || !data) return { ok: false, error: t('The attempt could not be re-scored.') }
  await logAdmin(gate.admin, gate.userId, 'attempt.rescore', id, { score: value, user: data.user_id })
  revalidatePath('/admin/attempts')
  revalidatePath(`/admin/users/${data.user_id}`)
  return { ok: true, message: t('Re-scored to {n}.', { n: value }) }
}

export async function deleteAttempt(id: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const { data, error } = await gate.admin.from('task_attempts').delete().eq('id', id).select('user_id, task_id').maybeSingle()
  if (error || !data) return { ok: false, error: t('That attempt could not be deleted.') }
  await logAdmin(gate.admin, gate.userId, 'attempt.delete', id, { user: data.user_id, task: data.task_id })
  revalidatePath('/admin/attempts')
  revalidatePath(`/admin/users/${data.user_id}`)
  return { ok: true, message: t('Deleted.') }
}

export async function deleteClass(id: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const { data, error } = await gate.admin.from('classes').delete().eq('id', id).select('name, teacher_id').maybeSingle()
  if (error || !data) return { ok: false, error: t('That class could not be deleted.') }
  await deleteClassFolder(id).catch(() => undefined)
  await logAdmin(gate.admin, gate.userId, 'class.delete', id, { name: data.name, teacher: data.teacher_id })
  revalidatePath('/admin/classes')
  return { ok: true, message: t('Deleted.') }
}

export async function removeClassMember(classId: string, studentId: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const { error } = await gate.admin.from('class_members').delete().eq('class_id', classId).eq('student_id', studentId)
  if (error) return { ok: false, error: t('That student could not be removed.') }
  await logAdmin(gate.admin, gate.userId, 'class.member', classId, { student: studentId })
  revalidatePath('/admin/classes')
  return { ok: true, message: t('Removed from the class.') }
}

/** The banner across the top of the app for every signed-in user. Empty text clears it. */
export async function saveAnnouncement(formData: FormData): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const text = String(formData.get('text') ?? '').trim().slice(0, 500)
  const tone = formData.get('tone') === 'warning' ? 'warning' : 'info'
  const untilValue = String(formData.get('until') ?? '').trim()
  const until = DATE.test(untilValue) ? untilValue : null

  const { error } = await gate.admin.from('site_settings').upsert(
    { key: 'announcement', value: { text, tone, until }, updated_at: new Date().toISOString(), updated_by: gate.userId },
    { onConflict: 'key' },
  )
  if (error) return { ok: false, error: t('That did not save. Please try again.') }
  await logAdmin(gate.admin, gate.userId, 'settings.announcement', null, { text: text || null, tone, until })
  revalidatePath('/', 'layout')
  return { ok: true, message: text ? t('The banner is live.') : t('The banner is cleared.') }
}

/** Closing sign-ups stops new accounts; everyone who has one can still sign in. */
export async function setSignupsOpen(open: boolean): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const { error } = await gate.admin
    .from('site_settings')
    .upsert({ key: 'signups_open', value: { open }, updated_at: new Date().toISOString(), updated_by: gate.userId }, { onConflict: 'key' })
  if (error) return { ok: false, error: t('That did not save. Please try again.') }
  await logAdmin(gate.admin, gate.userId, 'settings.signups', null, { open })
  revalidatePath('/', 'layout')
  return { ok: true, message: open ? t('Sign-ups are open.') : t('Sign-ups are closed.') }
}
