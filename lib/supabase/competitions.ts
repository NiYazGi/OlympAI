import 'server-only'

import { cache } from 'react'
import { getSessionUserId } from '@/lib/supabase/auth'
import { getReference } from '@/lib/supabase/reference'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'

import type { Competition, CompetitionSource } from '@/lib/types'
import type { Json } from '@/lib/supabase/database.types'

export type { Competition } from '@/lib/types'

/** Read only labelled HTTPS sources, including for older, unsourced entries. */
function readSources(value: Json): CompetitionSource[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
    const { title, url } = entry
    if (typeof title !== 'string' || typeof url !== 'string' || !title.trim()) return []
    try {
      if (new URL(url).protocol !== 'https:') return []
    } catch {
      return []
    }
    return [{ title, url }]
  })
}
/**
 * An olympiad stays listed until it is over: until its last day when it has
 * one, its first day when it does not. It used to vanish the morning it
 * started, and its page went 404 with it, so a student who opened the link
 * during the sitting found nothing.
 */
function stillOn(row: { starts_on: string | null; ends_on: string | null }, today: string) {
  const last = row.ends_on ?? row.starts_on
  return !last || last >= today
}

export const getCompetitions = cache(async (): Promise<Competition[]> => loadCompetitions(false))

const loadCompetitions = cache(async (includePast: boolean): Promise<Competition[]> => {
  const userId = await getSessionUserId()
  if (!userId) return []

  const supabase = await createClient()
  const locale = await getLocale()
  const today = new Date().toISOString().slice(0, 10)
  const [{ data: competitions }, reference, { data: registrations }, { data: details }] = await Promise.all([
    // Dateless catalogue entries are included: filtering on starts_on would
    // have hidden every one of them.
    supabase
      .from('competitions')
      .select('*')
      // `active` hides a competition without deleting it.
      .eq('active', true)
      .order('starts_on', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true }),
    getReference(),
    supabase.from('competition_registrations').select('competition_id').eq('user_id', userId),
    // Prefer the requested translation; researched Russian text remains
    // available when English or Kazakh has not yet been supplied.
    supabase
      .from('competition_details')
      .select('competition_id, locale, summary, format, route, eligibility')
      .in('locale', locale === 'ru' ? ['ru'] : [locale, 'ru']),
  ])
  const listed = (competitions ?? []).filter((row) => includePast || stillOn(row, today))
  if (!listed.length) return []

  const registered = new Set((registrations ?? []).map((row) => row.competition_id))
  const detailOf = new Map<string, NonNullable<typeof details>[number]>()
  for (const row of details ?? []) {
    if (!detailOf.has(row.competition_id) || row.locale === locale) detailOf.set(row.competition_id, row)
  }

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

  return listed.map((competition) => {
    const stats = competition.subject_id ? bySubject.get(competition.subject_id) : undefined
    const detail = detailOf.get(competition.id)
    return {
      id: competition.id,
      slug: competition.slug,
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
      region: competition.region,
      founded: competition.founded,
      officialUrl: competition.official_url,
      papersUrl: competition.papers_url,
      sources: readSources(competition.sources),
      reviewedOn: competition.reviewed_on,
      detailsLocale: detail?.locale ?? null,
      summary: detail?.summary ?? null,
      format: detail?.format ?? null,
      route: detail?.route ?? null,
      eligibility: detail?.eligibility ?? null,
    }
  })
})

/** One olympiad by slug, for the detail page. */
export const getCompetition = cache(async (slug: string): Promise<Competition | null> => {
  // A finished olympiad's page still opens: links to it are shared and saved.
  const all = await loadCompetitions(true)
  return all.find((competition) => competition.slug === slug || competition.id === slug) ?? null
})
