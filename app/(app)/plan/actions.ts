'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db'
import { trainingToday } from '@/lib/training-time'
import { reserveTrainingActivity } from '@/lib/training-mutations'
import { getT } from '@/lib/i18n/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { getPreparation } from '@/lib/supabase/preparation'
import { createClient } from '@/lib/supabase/server'

export type PreparationResult = { ok: boolean; error?: string }

/** Legacy callers use the unified form; never clear motivation or bypass load consent. */
export async function savePreparationPreferences():Promise<PreparationResult> {
  if (!await getVerifiedUser()) redirect('/login')
  redirect('/plan/settings')
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
  const today = trainingToday()
  if (step?.mock && step.date !== today) return { ok: false, error: 'Этот пробник назначен на другую дату. Сегодняшнее занятие находится на главной.' }
  const planned = preparation.plan.sessions.find((session) => session.mock_key === id && session.goal_key === preparation.mockPrefix &&
    session.on_date === today && !session.completed_at && !session.skipped_at && !session.superseded_at)
  let paperId: string | null
  try {
    const db = await getDb()
    paperId = await db.transaction(async (tx) => {
      const { rows: existing } = await tx.query<{ id: string }>(
        'select id from public.mock_tests where user_id = $1 and preparation_key = $2', [user.id, key],
      )
      if (existing[0]) {
        // Resuming an existing test must preserve its daily time reservation too.
        if (planned) await reserveTrainingActivity(tx, { userId: user.id, sessionId: planned.id, goalKey: preparation.mockPrefix,
          today, kind: 'mock', mockKey: id })
        return existing[0].id
      }
      if (!step?.mock || !planned) return null

      const { rows: open } = await tx.query(
        'select id from public.mock_tests where user_id = $1 and submitted_at is null and abandoned_at is null limit 1', [user.id],
      )
      if (open.length > 0) return null

      // Starting from the full route reaches this action directly, without
      // startTrainingSession. Keep both writes atomic so a refreshed plan cannot
      // replace this timebox with a second assignment while the test is open.
      const started = await reserveTrainingActivity(tx, { userId: user.id, sessionId: planned.id, goalKey: preparation.mockPrefix,
        today, kind: 'mock', mockKey: id })
      if (!started) return null

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
  const preparation = await getPreparation()
  if (preparation && paper.preparation_key.startsWith(preparation.mockPrefix)) {
    const reviewKey = paper.preparation_key.slice(preparation.mockPrefix.length)
    const reviews = preparation.plan.sessions.filter((session) => session.review_mock_key === reviewKey && !session.superseded_at && !session.skipped_at)
    if (reviews.length) {
      const today = reviews.find((session) => session.on_date === trainingToday() && !session.completed_at)
      redirect(today ? `/plan/session/${today.id}#review` : '/plan#training-calendar')
    }
  }
  const { error } = await createAdminClient().from('mock_tests')
    .update({ preparation_reviewed_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id).is('preparation_reviewed_at', null)
  if (error) return { ok: false, error: t('That did not save. Please try again.') }
  revalidatePath('/dashboard')
  revalidatePath('/plan')
  revalidatePath(`/mock/${id}`)
  return { ok: true }
}
