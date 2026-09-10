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

export type ReferenceSubject = { id: string; name: string; slug: string }
export type ReferenceTopic = { id: string; subject_id: string; name: string; slug: string }

export type Reference = {
  tasks: ReferenceTask[]
  subjectById: Record<string, string>
  topicById: Record<string, string>
  /** The rows themselves, for callers that need a slug rather than a name. */
  subjects: ReferenceSubject[]
  topics: ReferenceTopic[]
}

const EMPTY: Reference = { tasks: [], subjectById: {}, topicById: {}, subjects: [], topics: [] }

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
      admin.from('subjects').select('id, name, slug'),
      admin.from('topics').select('id, subject_id, name, slug'),
    ])

    return {
      tasks: (tasks ?? []) as ReferenceTask[],
      subjectById: Object.fromEntries((subjects ?? []).map((row) => [row.id, row.name])),
      topicById: Object.fromEntries((topics ?? []).map((row) => [row.id, row.name])),
      subjects: (subjects ?? []) as ReferenceSubject[],
      topics: (topics ?? []) as ReferenceTopic[],
    }
  },
  // The suffix is the manual bust. Nothing in the app writes this content —
  // it arrives by migration, which Next cannot know about — so bumping the key
  // is how you invalidate it everywhere at once.
  ['olympai-reference-content-v2'],
  // An hour was too long for content that only changes when someone publishes
  // it. A stale entry survives both a server restart and deleting .next/cache,
  // so an hour of "where is my new task" is an hour with no way out of it. A
  // minute keeps what the cache was for — collapsing the repeated reads inside
  // a render and across a burst of requests — and costs one round trip a
  // minute at worst.
  { revalidate: 60, tags: ['reference-content'] },
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
    supabase.from('subjects').select('id, name, slug'),
    supabase.from('topics').select('id, subject_id, name, slug'),
  ])

  return {
    tasks: (tasks ?? []) as ReferenceTask[],
    subjectById: Object.fromEntries((subjects ?? []).map((row) => [row.id, row.name])),
    topicById: Object.fromEntries((topics ?? []).map((row) => [row.id, row.name])),
    subjects: (subjects ?? []) as ReferenceSubject[],
    topics: (topics ?? []) as ReferenceTopic[],
  }
}

export async function getReference(): Promise<Reference> {
  try {
    return hasSupabaseSecretKey() ? await loadReference() : await loadReferenceAsUser()
  } catch (cause) {
    // Falling back to nothing is right — an empty catalogue is better than a
    // crashed page — but doing it silently is not. An empty library and a
    // broken query look identical on screen, and this is the only place that
    // can tell them apart.
    console.error('[reference] falling back to an empty catalogue:', cause)
    return EMPTY
  }
}

export type ReferenceLesson = {
  id: string
  topic_id: string
  title: string
  summary: string | null
  estimated_minutes: number | null
  position: number
  source_url: string | null
  licence: string
  attribution: string | null
}

export type ReferenceLessonBlock = {
  id: string
  lesson_id: string
  kind: 'concept' | 'explanation' | 'example' | 'key_facts'
  heading: string | null
  body: string | null
  items: string[]
  position: number
  /** Figure parameters, validated by lib/figures.ts before they are drawn. */
  visual_kind: string | null
  visual: unknown
}

/** Deliberately without `correct_index` and `explanation`. See below. */
export type ReferenceQuizQuestion = {
  id: string
  topic_id: string
  lesson_id: string | null
  prompt: string
  options: string[]
  position: number
}

export type ReferenceFlashcard = {
  id: string
  topic_id: string
  front: string
  back: string
  position: number
  source_url: string | null
  licence: string
  attribution: string | null
}

export type StudyReference = {
  lessons: ReferenceLesson[]
  blocks: ReferenceLessonBlock[]
  questions: ReferenceQuizQuestion[]
  cards: ReferenceFlashcard[]
}

const EMPTY_STUDY: StudyReference = { lessons: [], blocks: [], questions: [], cards: [] }

const STUDY_COLUMNS = {
  lessons:
    'id, topic_id, title, summary, estimated_minutes, position, source_url, licence, attribution',
  blocks: 'id, lesson_id, kind, heading, body, items, position, visual_kind, visual',
  // The answer key is missing from this list on purpose, and this is the only
  // place the list is written. `correct_index` decides whether an answer was
  // right and `explanation` gives the reasoning away before the student has
  // committed to one; both are read on the server, per answer, when marking.
  // A shared cross-user cache is the last place either belongs.
  questions: 'id, topic_id, lesson_id, prompt, options, position',
  cards: 'id, topic_id, front, back, position, source_url, licence, attribution',
} as const

/**
 * Lessons, quiz questions and the shared card decks.
 *
 * Same rows for everyone, same reasoning as the task catalogue above: read once
 * with the service role, cached across requests, and identical to what any
 * signed-in student may already read. Kept separate from the task cache so the
 * two can be invalidated apart — study content changes when someone writes a
 * lesson, the catalogue when someone adds a problem.
 *
 * Private cards are not here. A card with a user_id belongs to one student and
 * is fetched through their own session, under RLS, like every other personal
 * row in the app.
 */
const loadStudyReference = unstable_cache(
  async (): Promise<StudyReference> => {
    const admin = createAdminClient()
    const [{ data: lessons }, { data: blocks }, { data: questions }, { data: cards }] =
      await Promise.all([
        admin.from('lessons').select(STUDY_COLUMNS.lessons).order('position'),
        admin.from('lesson_blocks').select(STUDY_COLUMNS.blocks).order('position'),
        admin.from('quiz_questions').select(STUDY_COLUMNS.questions).order('position'),
        admin.from('flashcards').select(STUDY_COLUMNS.cards).is('user_id', null).order('position'),
      ])

    return {
      lessons: (lessons ?? []) as ReferenceLesson[],
      blocks: (blocks ?? []) as ReferenceLessonBlock[],
      questions: (questions ?? []) as ReferenceQuizQuestion[],
      cards: (cards ?? []) as ReferenceFlashcard[],
    }
  },
  ['olympai-study-content-v2'],
  { revalidate: 60, tags: ['study-content'] },
)

async function loadStudyReferenceAsUser(): Promise<StudyReference> {
  const supabase = await createClient()
  const [{ data: lessons }, { data: blocks }, { data: questions }, { data: cards }] =
    await Promise.all([
      supabase.from('lessons').select(STUDY_COLUMNS.lessons).order('position'),
      supabase.from('lesson_blocks').select(STUDY_COLUMNS.blocks).order('position'),
      supabase.from('quiz_questions').select(STUDY_COLUMNS.questions).order('position'),
      supabase.from('flashcards').select(STUDY_COLUMNS.cards).is('user_id', null).order('position'),
    ])

  return {
    lessons: (lessons ?? []) as ReferenceLesson[],
    blocks: (blocks ?? []) as ReferenceLessonBlock[],
    questions: (questions ?? []) as ReferenceQuizQuestion[],
    cards: (cards ?? []) as ReferenceFlashcard[],
  }
}

export async function getStudyReference(): Promise<StudyReference> {
  try {
    return hasSupabaseSecretKey() ? await loadStudyReference() : await loadStudyReferenceAsUser()
  } catch (cause) {
    console.error('[study] falling back to empty study content:', cause)
    return EMPTY_STUDY
  }
}
