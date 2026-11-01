import 'server-only'

import { cache } from 'react'
import { addDays, NO_FLAME, weekEnding, type Flame } from '@/lib/flame'
import { getSessionUserId } from '@/lib/supabase/auth'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { createClient } from '@/lib/supabase/server'

/**
 * The flame for the signed-in account, as of `today`.
 *
 * `today` is the student's calendar day when the caller knows it (the action
 * that records a visit is told it by the browser). When it does not — a server
 * render — the later of the UTC date and the last recorded visit stands in: a
 * visit recorded at two in the morning in Almaty is dated tomorrow in UTC
 * terms, and the flame must not look out for the hours until UTC catches up.
 */
export async function flameFor(today?: string): Promise<Flame> {
  if (!hasSupabaseEnv()) return NO_FLAME
  const userId = await getSessionUserId()
  if (!userId) return NO_FLAME

  const supabase = await createClient()
  const utcToday = new Date().toISOString().slice(0, 10)
  const { data: recent } = await supabase
    .from('daily_visits')
    .select('day')
    .eq('user_id', userId)
    .gte('day', addDays(utcToday, -8))
    .order('day', { ascending: false })
  const days = new Set((recent ?? []).map((row) => row.day))
  const latest = (recent ?? [])[0]?.day ?? null
  const reference = today ?? (latest && latest > utcToday ? latest : utcToday)

  const { data } = await supabase.rpc('visit_streak', { today: reference })
  const row = data?.[0]
  return {
    current: row?.current_streak ?? 0,
    best: row?.best_streak ?? 0,
    lit: days.has(reference),
    week: weekEnding(reference, days),
  }
}

/** One read per request, shared by the header, the rail and the dashboard. */
export const getFlame = cache(() => flameFor())
