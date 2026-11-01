'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionUserId } from '@/lib/supabase/auth'
import { utcToday } from '@/lib/supabase/day'

export type DayResult = { ok: boolean; error?: string }

const MAX_SLEEP = 16
/** Eighteen hours is not a day of work, it is a typo or a lie. */
const MAX_STUDY_MINUTES = 1080

function number(form: FormData, key: string): number {
  const raw = String(form.get(key) ?? '').replace(',', '.').trim()
  const value = Number(raw)
  return Number.isFinite(value) ? value : 0
}

/**
 * Records today's five axes.
 *
 * Upsert on (user_id, on_date): the check-in is a thing you correct through
 * the day — you do not know at nine in the morning how many hours the day will
 * end up holding — so a second submission edits the day rather than adding a
 * second one.
 *
 * Bounds are enforced here as well as in the check constraint, because a
 * rejected insert reaches the student as "that did not save" and a clamped one
 * reaches them as the number they meant.
 */
export async function saveDay(formData: FormData): Promise<DayResult> {
  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: 'Your session has expired. Please log in again.' }

  // Asked for in hours, because nobody thinks about their day in minutes;
  // stored in minutes, because half an hour is a real answer.
  const minutes = (key: string) =>
    Math.min(MAX_STUDY_MINUTES, Math.max(0, Math.round(number(formData, key) * 60)))

  const supabase = await createClient()
  const { error } = await supabase.from('day_states').upsert(
    {
      user_id: userId,
      on_date: utcToday(),
      theory_minutes: minutes('theory_hours'),
      solving_minutes: minutes('solving_hours'),
      load_minutes: minutes('load_hours'),
      // Zero is "not answered", which the scorer treats differently from 1.
      mental: Math.min(5, Math.max(0, Math.round(number(formData, 'mental')))),
      sleep_hours: Math.min(MAX_SLEEP, Math.max(0, Math.round(number(formData, 'sleep_hours') * 2) / 2)),
      lights_out: formData.get('lights_out') === 'on',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,on_date' },
  )
  if (error) return { ok: false, error: 'That did not save. Please try again.' }

  revalidatePath('/dashboard')
  return { ok: true }
}
