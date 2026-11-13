'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdminAction, type AdminResult } from '@/lib/supabase/admin-guard'
import { getT } from '@/lib/i18n/server'
import { logAdmin } from '@/lib/admin/log'
import {
  blockAccount,
  confirmEmail,
  deleteAccount,
  endSessions,
  getAccount,
  unblockAccount,
} from '@/lib/admin/accounts'
import { deleteClassFolder } from '@/lib/class-files'
import { GRADES } from '@/lib/profile-options'

/**
 * What an admin can do to an account. Each refuses to act on the admin's own
 * account where that would lock them out (block, delete, demote), and each
 * leaves a line in the admin log.
 */

const UUID = /^[0-9a-f-]{36}$/i

function done(userId: string, message: string): AdminResult {
  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}`)
  revalidatePath('/admin')
  return { ok: true, message }
}

export async function setRole(userId: string, role: 'student' | 'teacher'): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  if (!UUID.test(userId) || (role !== 'student' && role !== 'teacher')) return { ok: false, error: t('Malformed request body.') }

  // guard_profile_columns stops a user changing their own role; the service
  // role is the one writer it lets through.
  const { data, error } = await gate.admin.from('profiles').update({ role }).eq('id', userId).select('id').maybeSingle()
  if (error || !data) return { ok: false, error: t('That user could not be updated.') }
  await logAdmin(gate.admin, gate.userId, 'user.role', userId, { role })
  return done(userId, role === 'teacher' ? t('Now a teacher account.') : t('Now a student account.'))
}

export async function confirmUserEmail(userId: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  if (!(await confirmEmail(userId))) return { ok: false, error: t('That user could not be updated.') }
  await logAdmin(gate.admin, gate.userId, 'user.confirm', userId)
  return done(userId, t('Email confirmed. They can sign in now.'))
}

export async function blockUser(userId: string, reason: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  if (userId === gate.userId) return { ok: false, error: t('You cannot block your own account.') }
  const target = await getAccount(userId)
  if (!target) return { ok: false, error: t('That user could not be updated.') }
  if (target.is_admin) return { ok: false, error: t('Remove admin access first, then block.') }

  const note = reason.trim().slice(0, 300) || null
  if (!(await blockAccount(userId, note))) return { ok: false, error: t('That user could not be updated.') }
  await logAdmin(gate.admin, gate.userId, 'user.block', userId, { reason: note })
  return done(userId, t('Blocked. They were signed out everywhere.'))
}

export async function unblockUser(userId: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  if (!(await unblockAccount(userId))) return { ok: false, error: t('That user could not be updated.') }
  await logAdmin(gate.admin, gate.userId, 'user.unblock', userId)
  return done(userId, t('Unblocked.'))
}

export async function signOutEverywhere(userId: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const ended = await endSessions(userId)
  await logAdmin(gate.admin, gate.userId, 'user.sessions', userId, { ended })
  return done(userId, t('{n} {n|session|sessions} ended.', { n: ended }))
}

export async function resetOnboarding(userId: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const { data, error } = await gate.admin
    .from('profiles')
    .update({ onboarding_completed_at: null, tour_completed_at: null })
    .eq('id', userId)
    .select('id')
    .maybeSingle()
  if (error || !data) return { ok: false, error: t('That user could not be updated.') }
  await logAdmin(gate.admin, gate.userId, 'user.onboarding', userId)
  return done(userId, t('They will see the setup questions and the tour on their next visit.'))
}

const GRADE_OPTIONS = new Set<string>(GRADES)

export async function updateProfile(userId: string, formData: FormData): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate

  const fullName = String(formData.get('full_name') ?? '').trim().slice(0, 120) || null
  const username = String(formData.get('username') ?? '').trim().slice(0, 40) || null
  if (username && !/^[\p{L}\p{N}_.-]{3,40}$/u.test(username)) {
    return { ok: false, error: t('A username is 3 to 40 letters, digits, dots, dashes or underscores.') }
  }
  const gradeValue = String(formData.get('grade') ?? '').trim()
  const grade = GRADE_OPTIONS.has(gradeValue) ? gradeValue : null

  const { data, error } = await gate.admin
    .from('profiles')
    .update({ full_name: fullName, username, grade })
    .eq('id', userId)
    .select('id')
    .maybeSingle()
  if (error) {
    return { ok: false, error: error.message.includes('unique') ? t('That username is taken.') : t('That user could not be updated.') }
  }
  if (!data) return { ok: false, error: t('That user could not be updated.') }
  await logAdmin(gate.admin, gate.userId, 'user.profile', userId, { full_name: fullName, username, grade })
  return done(userId, t('Saved.'))
}

/**
 * Deletes the account and everything it owns. The confirmation is the
 * account's email typed back, checked here rather than only in the browser.
 */
export async function deleteUser(userId: string, typedEmail: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  if (userId === gate.userId) return { ok: false, error: t('You cannot delete your own account here.') }
  const target = await getAccount(userId)
  if (!target) return { ok: false, error: t('That user could not be updated.') }
  if (target.is_admin) return { ok: false, error: t('Remove admin access first, then delete.') }
  if (typedEmail.trim().toLowerCase() !== target.email.toLowerCase()) {
    return { ok: false, error: t('Type the account’s email exactly to confirm.') }
  }

  const { deleted, classIds } = await deleteAccount(userId)
  if (!deleted) return { ok: false, error: t('That user could not be updated.') }
  await Promise.all(classIds.map((id) => deleteClassFolder(id).catch(() => undefined)))
  await logAdmin(gate.admin, gate.userId, 'user.delete', userId, { email: target.email, name: target.full_name })
  revalidatePath('/admin/users')
  revalidatePath('/admin')
  redirect('/admin/users?deleted=1')
}

/** Billing: a plan for a number of days, no payment; or end one now. */
export async function grantPlan(userId: string, planId: string, days: number): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const { billingEnabled, grantSubscription } = await import('@/lib/billing')
  const { isPlanId } = await import('@/lib/billing-types')
  if (!billingEnabled()) return { ok: false, error: t('Plans are not available here yet.') }
  const span = Math.round(Number(days))
  if (!UUID.test(userId) || !isPlanId(planId) || planId === 'free' || !(span >= 1 && span <= 730)) {
    return { ok: false, error: t('Malformed request body.') }
  }
  await grantSubscription(userId, planId, span)
  await logAdmin(gate.admin, gate.userId, 'user.plan.grant', userId, { plan: planId, days: span })
  revalidatePath('/pricing')
  return done(userId, t('Plan granted.'))
}

export async function endPlan(userId: string, subscriptionId: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  if (!UUID.test(userId) || !UUID.test(subscriptionId)) return { ok: false, error: t('Malformed request body.') }
  const { endSubscriptionNow } = await import('@/lib/billing')
  await endSubscriptionNow(subscriptionId, userId)
  await logAdmin(gate.admin, gate.userId, 'user.plan.end', userId, { subscription: subscriptionId })
  return done(userId, t('Plan ended.'))
}
