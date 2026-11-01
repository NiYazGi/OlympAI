'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionUserId } from '@/lib/supabase/auth'

export type GoalResult = { ok: boolean; error?: string }

const MIN_GOAL = 10
const MAX_GOAL = 500
/** A target further out than this is a wish, not a plan. */
const MAX_HORIZON_DAYS = 730

/** Longer than this is a paragraph, and the field is meant to hold a name. */
const MAX_UNIVERSITY = 120

function revalidateGoalViews() {
  revalidatePath('/path')
  revalidatePath('/dashboard')
  revalidatePath('/olympiads')
  revalidatePath('/method')
}

/**
 * Sets what the student is training for and by when.
 *
 * Both halves are validated against the database rather than trusted: the
 * competition must exist, and the date has to be in the future and inside a
 * horizon the schedule can say anything useful about.
 */
export async function setGoal(formData: FormData): Promise<GoalResult> {
  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: 'Your session has expired. Please log in again.' }

  const competitionId = String(formData.get('competition_id') ?? '').trim()
  const targetDate = String(formData.get('target_date') ?? '').trim()
  if (!competitionId) return { ok: false, error: 'Choose what you are preparing for.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return { ok: false, error: 'Choose a target date.' }
  }

  const supabase = await createClient()
  const { data: competition } = await supabase
    .from('competitions')
    .select('id, subject_id')
    .eq('id', competitionId)
    .maybeSingle()
  if (!competition) return { ok: false, error: 'That competition is no longer listed.' }

  const target = new Date(`${targetDate}T00:00:00Z`)
  const today = new Date()
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const days = Math.round((target.getTime() - start) / 86_400_000)
  if (Number.isNaN(days) || days < 1) {
    return { ok: false, error: 'Pick a date in the future.' }
  }
  if (days > MAX_HORIZON_DAYS) {
    return { ok: false, error: 'Pick a date within the next two years.' }
  }

  // A generic target carries no subject, so keep whatever the student chose.
  const subjectPatch = competition.subject_id ? { target_subject_id: competition.subject_id } : {}

  const { error } = await supabase
    .from('profiles')
    .update({ target_competition_id: competition.id, target_date: targetDate, ...subjectPatch })
    .eq('id', userId)
  if (error) return { ok: false, error: 'That did not save. Please try again.' }

  revalidateGoalViews()
  return { ok: true }
}

export async function clearGoal(): Promise<GoalResult> {
  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: 'Your session has expired. Please log in again.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ target_competition_id: null, target_date: null })
    .eq('id', userId)
  if (error) return { ok: false, error: 'That did not save. Please try again.' }

  revalidateGoalViews()
  return { ok: true }
}

/** Used when a generic target leaves the subject unset. */
export async function setTargetSubject(subjectId: string | null): Promise<GoalResult> {
  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: 'Your session has expired. Please log in again.' }

  const supabase = await createClient()
  if (subjectId) {
    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .maybeSingle()
    if (!subject) return { ok: false, error: 'That subject is no longer available.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ target_subject_id: subjectId })
    .eq('id', userId)
  if (error) return { ok: false, error: 'That did not save. Please try again.' }

  revalidateGoalViews()
  return { ok: true }
}

export async function setDailyGoal(goal: number): Promise<GoalResult> {
  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: 'Your session has expired. Please log in again.' }
  if (!Number.isInteger(goal) || goal < MIN_GOAL || goal > MAX_GOAL) {
    return { ok: false, error: `Choose a goal between ${MIN_GOAL} and ${MAX_GOAL} XP.` }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ daily_xp_goal: goal }).eq('id', userId)
  if (error) return { ok: false, error: 'That did not save. Please try again.' }

  revalidateGoalViews()
  return { ok: true }
}

/**
 * What the olympiad is for.
 *
 * Never validated against a list. The end of this is somebody's own sentence
 * about their own life — a university, a faculty, a scholarship, a city — and
 * a picker would turn it into a field we would then have to keep accurate for
 * every country a student might come from. Empty clears it.
 */
export async function setTargetUniversity(formData: FormData): Promise<GoalResult> {
  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: 'Your session has expired. Please log in again.' }

  const value = String(formData.get('target_university') ?? '').trim()
  if (value.length > MAX_UNIVERSITY) {
    return { ok: false, error: 'Keep it under a line.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ target_university: value || null })
    .eq('id', userId)
  if (error) return { ok: false, error: 'That did not save. Please try again.' }

  revalidateGoalViews()
  return { ok: true }
}
