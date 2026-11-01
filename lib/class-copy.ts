import type { Dictionary } from '@/lib/i18n/dictionaries'

/**
 * How long ago, in the words a teacher would use.
 *
 * Days rather than a date: "3 days ago" answers the question a roster is being
 * read for, which is who has gone quiet. A date would have to be worked out
 * against today's before it meant anything.
 */
export function lastSeen(at: string | null, t: Dictionary) {
  if (!at) return t.classes.never
  const days = Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000)
  return days <= 0 ? t.classes.today : t.classes.daysAgo(days)
}

/**
 * Below this an accuracy is worth naming on a roster.
 *
 * The same 70% the rest of the app calls weak (see weakTopics in
 * lib/supabase/queries.ts). Without a threshold the column shows every
 * student's lowest topic, and "Algebra 82%" read as a problem to fix when it
 * was the best class in the room.
 */
export const WEAK_BELOW = 70
