import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasSupabaseSecretKey } from '@/lib/supabase/secret-env'
import { createClient } from '@/lib/supabase/server'

export type ReferenceTask = {
  id: string
  subject_id: string
  topic_id: string
  title: string
  problem: string
  difficulty: number
  hints: string[]
  source: string | null
  estimated_minutes: number | null
  given: string[]
  find_prompt: string | null
  diagram_url: string | null
  source_url: string | null
  licence: string
  attribution: string | null
}

export type Reference = {
  tasks: ReferenceTask[]
  subjectById: Record<string, string>
  topicById: Record<string, string>
}

const EMPTY: Reference = { tasks: [], subjectById: {}, topicById: {} }

/**
 * Subjects, topics and the task catalogue are the same rows for everyone: the
 * RLS policy on all three is `for select to authenticated using (true)`. They
 * were nonetheless refetched per user per page — three round trips of about
 * half a second each, repeated in the layout and again in the page.
 *
 * They are read once with the service role and cached across requests. That is
 * not a privilege escalation: it returns exactly what any signed-in user is
 * already entitled to read, and callers still establish a session first.
 *
 * `official_solution` is excluded here on purpose. It is the one column that is
 * not for the student's eyes, and a shared cache is the last place it belongs;
 * the grader reads it separately, per attempt, on the server.
 */
const loadReference = unstable_cache(
  async (): Promise<Reference> => {
    const admin = createAdminClient()
    const [{ data: tasks }, { data: subjects }, { data: topics }] = await Promise.all([
      admin
        .from('tasks')
        .select(
          'id, subject_id, topic_id, title, problem, difficulty, hints, source, estimated_minutes, given, find_prompt, diagram_url, source_url, licence, attribution',
        )
        .order('difficulty', { ascending: true }),
      admin.from('subjects').select('id, name'),
      admin.from('topics').select('id, name'),
    ])

    return {
      tasks: (tasks ?? []) as ReferenceTask[],
      subjectById: Object.fromEntries((subjects ?? []).map((row) => [row.id, row.name])),
      topicById: Object.fromEntries((topics ?? []).map((row) => [row.id, row.name])),
    }
  },
  ['olympai-reference-content'],
  { revalidate: 3600, tags: ['reference-content'] },
)

/**
 * Falls back to the caller's own session when no service key is configured, so
 * the app still works — just without the shared cache.
 */
async function loadReferenceAsUser(): Promise<Reference> {
  const supabase = await createClient()
  const [{ data: tasks }, { data: subjects }, { data: topics }] = await Promise.all([
    supabase
      .from('tasks')
      .select(
        'id, subject_id, topic_id, title, problem, difficulty, hints, source, estimated_minutes, given, find_prompt, diagram_url, source_url, licence, attribution',
      )
      .order('difficulty', { ascending: true }),
    supabase.from('subjects').select('id, name'),
    supabase.from('topics').select('id, name'),
  ])

  return {
    tasks: (tasks ?? []) as ReferenceTask[],
    subjectById: Object.fromEntries((subjects ?? []).map((row) => [row.id, row.name])),
    topicById: Object.fromEntries((topics ?? []).map((row) => [row.id, row.name])),
  }
}

export async function getReference(): Promise<Reference> {
  try {
    return hasSupabaseSecretKey() ? await loadReference() : await loadReferenceAsUser()
  } catch {
    return EMPTY
  }
}
