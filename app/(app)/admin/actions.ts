'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminAction, type AdminResult } from '@/lib/supabase/admin-guard'
import { getT } from '@/lib/i18n/server'
import { logAdmin } from '@/lib/admin/log'

const MAX_NAME = 160
const DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Grants or revokes admin. Two refusals: you cannot demote yourself (a panel
 * that lets its last admin lock everyone out is a trap), and the target must
 * exist.
 */
export async function setAdmin(userId: string, makeAdmin: boolean): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  if (userId === gate.userId && !makeAdmin) {
    return { ok: false, error: t('You cannot remove your own admin access. Ask another admin.') }
  }

  const { data, error } = await gate.admin
    .from('profiles')
    .update({ is_admin: makeAdmin })
    .eq('id', userId)
    .select('id')
    .maybeSingle()
  if (error || !data) return { ok: false, error: t('That user could not be updated.') }

  await logAdmin(gate.admin, gate.userId, makeAdmin ? 'admin.grant' : 'admin.revoke', userId)
  revalidatePath('/admin', 'layout')
  return { ok: true, message: makeAdmin ? t('Admin access granted.') : t('Admin access removed.') }
}

function optionalDate(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return DATE.test(text) ? text : null
}

function httpUrl(value: FormDataEntryValue | null): string | null | false {
  const text = String(value ?? '').trim()
  if (!text) return null
  try {
    const parsed = new URL(text)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? text : false
  } catch {
    return false
  }
}

/**
 * An address for the olympiad's page. Latin names make a readable one; any
 * other name gets a short random one, which is as stable once written.
 */
function slugFor(name: string) {
  const latin = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  const suffix = crypto.randomUUID().slice(0, 4)
  return latin.length >= 3 ? `${latin}-${suffix}` : `olympiad-${crypto.randomUUID().slice(0, 8)}`
}

const DETAIL_LOCALES = ['ru', 'kk', 'en'] as const
const MAX_DETAIL = 2000

type Translate = Awaited<ReturnType<typeof getT>>

/**
 * Reads the olympiad form, shared by adding and editing so the two cannot
 * drift: the same fields, the same checks, the same limits.
 */
function readCompetition(formData: FormData, t: Translate) {
  const name = String(formData.get('name') ?? '').trim().slice(0, MAX_NAME)
  if (!name) return { error: t('Give the olympiad a name.') } as const

  const registrationUrl = httpUrl(formData.get('registration_url'))
  const officialUrl = httpUrl(formData.get('official_url'))
  const papersUrl = httpUrl(formData.get('papers_url'))
  if (registrationUrl === false || officialUrl === false || papersUrl === false) {
    return { error: t('Links must be http(s) URLs.') } as const
  }

  const startsOn = optionalDate(formData.get('starts_on'))
  const endsOn = optionalDate(formData.get('ends_on'))
  if (startsOn && endsOn && endsOn < startsOn) return { error: t('It cannot end before it starts.') } as const

  const founded = Number(formData.get('founded')) || null
  const row = {
    name,
    subject_id: String(formData.get('subject_id') ?? '').trim() || null,
    level: String(formData.get('level') ?? '').trim().slice(0, 60) || null,
    region: String(formData.get('region') ?? '').trim().slice(0, 80) || null,
    founded: founded && founded > 1800 && founded <= new Date().getFullYear() ? founded : null,
    official_url: officialUrl,
    papers_url: papersUrl,
    starts_on: startsOn,
    ends_on: endsOn,
    registration_deadline: optionalDate(formData.get('registration_deadline')),
    registration_url: registrationUrl,
    // The form always sends `visible`: "on" when ticked, nothing when not.
    active: formData.get('visible') === 'on',
  }

  // The write-up, one row per language: what it is, the shape of the papers,
  // who may enter and how you get there. Only a language with a summary keeps
  // a row.
  const details = DETAIL_LOCALES.map((locale) => {
    const field = (key: string) => String(formData.get(`${key}_${locale}`) ?? '').trim().slice(0, MAX_DETAIL) || null
    return { locale, summary: field('summary'), format: field('format'), route: field('route'), eligibility: field('eligibility') }
  })
  return { row, details } as const
}

function revalidateOlympiads(slug?: string | null) {
  revalidatePath('/admin/olympiads')
  revalidatePath('/olympiads')
  if (slug) revalidatePath(`/olympiads/${slug}`)
}

export async function addCompetition(formData: FormData): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate

  const parsed = readCompetition(formData, t)
  if ('error' in parsed) return { ok: false, error: parsed.error }

  const slug = slugFor(parsed.row.name)
  const { data: created, error } = await gate.admin
    .from('competitions')
    .insert({ ...parsed.row, slug, created_by: gate.userId })
    .select('id')
    .single()
  if (error || !created) return { ok: false, error: error?.message ?? t('That could not be saved.') }

  const details = parsed.details.flatMap((detail) =>
    detail.summary ? [{ competition_id: created.id, ...detail, summary: detail.summary }] : [],
  )
  if (details.length) {
    const { error: detailError } = await gate.admin.from('competition_details').insert(details)
    if (detailError) return { ok: false, error: detailError.message }
  }

  await logAdmin(gate.admin, gate.userId, 'olympiad.add', created.id, { name: parsed.row.name })
  revalidateOlympiads(slug)
  return { ok: true, message: t('Added “{name}”.', { name: parsed.row.name }) }
}

/**
 * Changes an olympiad that is already listed: every field the add form has,
 * the write-ups in each language, and whether students see it. The slug, and
 * so the page address students saved, stays the same.
 */
export async function updateCompetition(id: string, formData: FormData): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate

  const parsed = readCompetition(formData, t)
  if ('error' in parsed) return { ok: false, error: parsed.error }

  const { data: updated, error } = await gate.admin
    .from('competitions')
    .update(parsed.row)
    .eq('id', id)
    .select('id, slug')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!updated) return { ok: false, error: t('That olympiad no longer exists.') }

  // Each language is replaced whole, which is what the form shows; one whose
  // summary was cleared loses its write-up.
  for (const detail of parsed.details) {
    await gate.admin.from('competition_details').delete().eq('competition_id', id).eq('locale', detail.locale)
    if (!detail.summary) continue
    const { error: detailError } = await gate.admin
      .from('competition_details')
      .insert({ competition_id: id, ...detail, summary: detail.summary })
    if (detailError) return { ok: false, error: detailError.message }
  }

  await logAdmin(gate.admin, gate.userId, 'olympiad.edit', id, { name: parsed.row.name })
  revalidateOlympiads(updated.slug)
  return { ok: true, message: t('Saved “{name}”.', { name: parsed.row.name }) }
}

/** Hides an olympiad from students without deleting it, or shows it again. */
export async function setCompetitionActive(id: string, active: boolean): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate

  const { data, error } = await gate.admin
    .from('competitions')
    .update({ active })
    .eq('id', id)
    .select('id, slug')
    .maybeSingle()
  if (error || !data) return { ok: false, error: t('That could not be saved.') }
  await logAdmin(gate.admin, gate.userId, 'olympiad.active', id, { active })
  revalidateOlympiads(data.slug)
  return { ok: true, message: active ? t('Students can see it again.') : t('Hidden from students.') }
}

export async function removeCompetition(id: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate

  const { data, error } = await gate.admin.from('competitions').delete().eq('id', id).select('name').maybeSingle()
  if (error) return { ok: false, error: t('That could not be removed.') }

  await logAdmin(gate.admin, gate.userId, 'olympiad.remove', id, { name: data?.name ?? null })
  revalidateOlympiads()
  return { ok: true, message: t('Removed.') }
}

/**
 * Settles a student's report. For a grading report the attempt can be
 * re-scored at the same time; topic statistics, XP and recommendations are all
 * derived from task_attempts, so correcting the row corrects everything that
 * was built on the wrong verdict.
 */
export async function resolveReport(input: {
  reportId: string
  status: 'resolved' | 'rejected'
  resolution: string
  regrade?: { score: number } | null
}): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const resolution = input.resolution.trim().slice(0, 2000)
  if (!resolution) return { ok: false, error: t('Write a short answer for the student.') }
  if (input.status !== 'resolved' && input.status !== 'rejected') return { ok: false, error: t('Malformed request body.') }

  const { data: report } = await gate.admin
    .from('task_reports')
    .select('id, task_id, attempt_id')
    .eq('id', input.reportId)
    .maybeSingle()
  if (!report) return { ok: false, error: t('That report no longer exists.') }

  if (input.regrade && report.attempt_id) {
    const score = Math.round(input.regrade.score)
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return { ok: false, error: t('A score is a whole number from 0 to 100.') }
    }
    const { error } = await gate.admin
      .from('task_attempts')
      .update({ score, is_correct: score >= 85, graded_by: 'admin' })
      .eq('id', report.attempt_id)
    if (error) return { ok: false, error: t('The attempt could not be re-scored.') }
  }

  const { error } = await gate.admin
    .from('task_reports')
    .update({ status: input.status, resolution, resolved_at: new Date().toISOString() })
    .eq('id', report.id)
  if (error) return { ok: false, error: t('That did not save. Please try again.') }

  await logAdmin(gate.admin, gate.userId, 'report.resolve', report.id, {
    status: input.status,
    task: report.task_id,
    regrade: input.regrade?.score ?? null,
  })
  revalidatePath('/admin/reports')
  revalidatePath(`/tasks/${report.task_id}`)
  revalidatePath('/me')
  revalidatePath('/dashboard')
  return { ok: true, message: t('Saved. The student sees the answer on the task page.') }
}
