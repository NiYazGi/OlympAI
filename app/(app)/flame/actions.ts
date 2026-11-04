'use server'

import { revalidatePath } from 'next/cache'
import { addDays, type Flame } from '@/lib/flame'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { flameFor } from '@/lib/supabase/visits'

/**
 * Counts today, the student's today, as a visit. Called once a day by the
 * browser when the app opens.
 *
 * The date comes from the browser, because the browser knows the student's
 * calendar and the server does not. It is trusted only to within a day of UTC
 * either side — every time zone in use is — so it cannot be used to fill in
 * last month or bank next week.
 */
export async function recordVisit(
  day: string,
): Promise<{ ok: boolean; flame?: Flame; extended?: boolean }> {
  const user = await getVerifiedUser()
  if (!user) return { ok: false }

  const utcToday = new Date().toISOString().slice(0, 10)
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    day >= addDays(utcToday, -1) &&
    day <= addDays(utcToday, 1)
  if (!valid) return { ok: false }

  const supabase = await createClient()
  const { error } = await supabase.from('daily_visits').insert({ user_id: user.id, day })
  // 23505: today is already counted, which is the ordinary case for every
  // visit after the first.
  if (error && error.code !== '23505') return { ok: false }
  const extended = !error

  if (extended) {
    // The streak figure on the dashboard and the rail is rendered on the
    // server; the first visit of the day changes it.
    revalidatePath('/', 'layout')
  }
  return { ok: true, flame: await flameFor(day), extended }
}
