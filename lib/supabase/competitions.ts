import 'server-only'

import { cache } from 'react'
import { getSessionUserId } from '@/lib/supabase/auth'
import { getReference } from '@/lib/supabase/reference'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseEnv } from '@/lib/supabase/env'

import type { Competition } from '@/lib/types'

export type { Competition } from '@/lib/types'

/**
 * The Olympiads page used to render four invented competitions with invented
 * dates and an invented readiness percentage, plus a Register button wired to
 * nothing. It now reads the competitions table, which ships empty on purpose:
 * an empty page is correct, a page of plausible fictional dates is not.
 */
export const getCompetitions = cache(async (): Promise<Competition[]> => {
  if (!hasSupabaseEnv()) return []
  const userId = await getSessionUserId()
  if (!userId) return []

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const [{ data: competitions }, reference, { data: registrations }] = await Promise.all([
    // Dateless catalogue entries are included: filtering on starts_on would
    // have hidden every one of them.
    supabase
      .from('competitions')
      .select('*')
      .or(`starts_on.is.null,starts_on.gte.${today}`)
      .order('starts_on', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true }),
    getReference(),
    supabase.from('competition_registrations').select('competition_id').eq('user_id', userId),
  ])
  if (!competitions?.length) return []

  const registered = new Set((registrations ?? []).map((row) => row.competition_id))

  // Readiness is accuracy in the competition's subject, computed from real
  // attempts. Null when there is nothing to compute it from, so the page can
  // say "no data yet" instead of showing a made-up number.
  const { data: attempts } = await supabase
    .from('task_attempts')
    .select('task_id, is_correct')
    .eq('user_id', userId)
  const subjectOfTask = new Map(reference.tasks.map((task) => [task.id, task.subject_id]))
  const bySubject = new Map<string, { total: number; correct: number }>()
  for (const attempt of attempts ?? []) {
    const subjectId = subjectOfTask.get(attempt.task_id)
    if (!subjectId) continue
    const current = bySubject.get(subjectId) ?? { total: 0, correct: 0 }
    current.total += 1
    current.correct += attempt.is_correct ? 1 : 0
    bySubject.set(subjectId, current)
  }

  return competitions.map((competition) => {
    const stats = competition.subject_id ? bySubject.get(competition.subject_id) : undefined
    return {
      id: competition.id,
      name: competition.name,
      subject: competition.subject_id
        ? reference.subjectById[competition.subject_id] ?? null
        : null,
      level: competition.level,
      startsOn: competition.starts_on,
      endsOn: competition.ends_on,
      registrationUrl: competition.registration_url,
      registrationDeadline: competition.registration_deadline,
      registered: registered.has(competition.id),
      readiness: stats?.total ? Math.round((stats.correct / stats.total) * 100) : null,
    }
  })
})
