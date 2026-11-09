'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { getPreparation } from '@/lib/supabase/preparation'
import { createClient } from '@/lib/supabase/server'

export type PreparationResult = { ok: boolean; error?: string }

export async function savePreparationPreferences(
  _previous: PreparationResult | null,
  form: FormData,
): Promise<PreparationResult> {
  const t = await getT()
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }

  const supabase = await createClient()
  if (form.get('mode') === 'default') {
    const { error } = await supabase.from('preparation_preferences').delete().eq('user_id', user.id)
    if (error) return { ok: false, error: t('That did not save. Please try again.') }
  } else {
    const weekdays = [...new Set(form.getAll('weekday').map(Number))].sort()
    const minutes = Number(form.get('minutes'))
    const schoolGrade = form.get('school_grade') ? Number(form.get('school_grade')) : null
    if (weekdays.length === 0 || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
      return { ok: false, error: t('Choose at least one study day.') }
    }
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 360 ||
      (schoolGrade !== null && (!Number.isInteger(schoolGrade) || schoolGrade < 6 || schoolGrade > 12))) {
      return { ok: false, error: t('Choose a valid class and 15 to 360 minutes per session.') }
    }
    const { error } = await supabase.from('preparation_preferences').upsert({
      user_id: user.id, weekdays, session_minutes: minutes, school_grade: schoolGrade,
    }, { onConflict: 'user_id' })
    if (error) return { ok: false, error: t('That did not save. Please try again.') }
  }

  revalidatePath('/dashboard')
  revalidatePath('/plan')
  return { ok: true }
}

export async function startPreparationMock(
  _previous: PreparationResult | null,
  form: FormData,
): Promise<PreparationResult> {
  const t = await getT()
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }

  const preparation = await getPreparation()
  const id = String(form.get('step') ?? '')
  if (!preparation || form.get('scope') !== preparation.mockPrefix || !/^mock-[12]$/.test(id)) {
    return { ok: false, error: t('This route changed. Refresh the plan and try again.') }
  }

  const key = preparation.mockPrefix + id
  const step = preparation.plan.steps.find((item) => item.id === id && item.kind === 'mock')
  let paperId: string | null
  try {
    const db = await getDb()
    paperId = await db.transaction(async (tx) => {
      const { rows: existing } = await tx.query<{ id: string }>(
        'select id from public.mock_tests where user_id = $1 and preparation_key = $2', [user.id, key],
      )
      if (existing[0]) return existing[0].id
      if (!step?.mock) return null

      const { rows: open } = await tx.query(
        'select id from public.mock_tests where user_id = $1 and submitted_at is null limit 1', [user.id],
      )
      if (open.length > 0) return null

      const { rows: created } = await tx.query<{ id: string }>(
        `insert into public.mock_tests (user_id, subject_id, task_ids, duration_minutes, preparation_key)
         values ($1, $2, $3, $4, $5) returning id`,
        [user.id, preparation.subjectId, step.mock.taskIds, step.minutes, key],
      )
      return created[0].id
    })
  } catch {
    return { ok: false, error: t('The test could not be started.') }
  }
  if (!paperId) {
    return { ok: false, error: t(step?.mock
      ? 'Finish your open mock test before starting this one.'
      : 'This route changed. Refresh the plan and try again.') }
  }

  revalidatePath('/dashboard')
  revalidatePath('/plan')
  revalidatePath('/mock')
  redirect(`/mock/${paperId}`)
}

export async function finishPreparationReview(
  _previous: PreparationResult | null,
  form: FormData,
): Promise<PreparationResult> {
  const t = await getT()
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }

  const id = String(form.get('mock_id') ?? '')
  const supabase = await createClient()
  const { data: paper } = await supabase.from('mock_tests').select('id, preparation_key, submitted_at')
    .eq('user_id', user.id).eq('id', id).maybeSingle()
  if (!paper?.preparation_key || !paper.submitted_at) return { ok: false, error: t('That test was not found.') }
  const { error } = await createAdminClient().from('mock_tests')
    .update({ preparation_reviewed_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id).is('preparation_reviewed_at', null)
  if (error) return { ok: false, error: t('That did not save. Please try again.') }
  revalidatePath('/dashboard')
  revalidatePath('/plan')
  revalidatePath(`/mock/${id}`)
  return { ok: true }
}
