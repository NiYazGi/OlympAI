import 'server-only'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getSessionUserId } from '@/lib/supabase/auth'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { getGoal, getProgressAnalytics } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n'
import {
  EMPTY_DAY,
  phaseFor,
  scoreDay,
  type DayInputs,
  type DayScore,
} from '@/lib/day-state'

export type DayStatus = {
  /** The UTC day this is about, ISO. See the note in the migration. */
  date: string
  inputs: DayInputs
  /** False until the student has filled it in, which is not the same as zeroes. */
  recorded: boolean
  score: DayScore
  /** Days to the target, or null when there is no target yet. */
  daysLeft: number | null
}

/** Today as the rest of the app counts it: the UTC calendar day. */
export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function daysUntil(targetDate: string | null, now = new Date()): number | null {
  if (!targetDate) return null
  const target = new Date(`${targetDate}T00:00:00Z`).getTime()
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  if (Number.isNaN(target)) return null
  return Math.max(0, Math.round((target - start) / 86_400_000))
}

/**
 * Today's five axes: what the student reported, plus the one axis the app can
 * see for itself.
 *
 * Graded work is never asked for. The app already knows how much of it
 * happened, and a self-reported figure that contradicts the XP on the same
 * screen would make both of them worth less.
 */
export const getDayStatus = cache(async (): Promise<DayStatus> => {
  const date = utcToday()
  const [goal, analytics, t] = await Promise.all([getGoal(), getProgressAnalytics(), getT()])
  const daysLeft = daysUntil(goal.targetDate)
  const phase = phaseFor(daysLeft)
  const graded = { today: analytics.xp.today, goal: analytics.xp.goal }

  const blank: DayStatus = {
    date,
    inputs: EMPTY_DAY,
    recorded: false,
    score: scoreDay(EMPTY_DAY, phase, graded, t),
    daysLeft,
  }

  if (!hasSupabaseEnv()) return blank
  const userId = await getSessionUserId()
  if (!userId) return blank

  const supabase = await createClient()
  const { data } = await supabase
    .from('day_states')
    .select('theory_minutes, solving_minutes, mental, sleep_hours, lights_out, load_minutes')
    .eq('user_id', userId)
    .eq('on_date', date)
    .maybeSingle()

  if (!data) return blank

  const inputs: DayInputs = {
    theoryMinutes: data.theory_minutes,
    solvingMinutes: data.solving_minutes,
    mental: data.mental,
    sleepHours: Number(data.sleep_hours),
    lightsOut: data.lights_out,
    loadMinutes: data.load_minutes,
    reported: true,
  }

  return { date, inputs, recorded: true, score: scoreDay(inputs, phase, graded, t), daysLeft }
})
