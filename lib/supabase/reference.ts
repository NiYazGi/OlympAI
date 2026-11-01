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
  /** Which stage the problem was written for. Null until classified. */
  level: string | null
  /** The sitting it came from, when it came from a real one. Migration 47. */
  paper: string | null
}

export type ReferenceSubject = { id: string; name: string; slug: string }
export type ReferenceTopic = {
  id: string
  subject_id: string
  name: string
  slug: string
  /** Syllabus order within the subject. See migration 44. */
  position: number
}

export type Reference = {
  tasks: ReferenceTask[]
  subjectById: Record<string, string>
  topicById: Record<string, string>
  /** Syllabus order, by topic id. See migration 44. */
  topicPositionById: Record<string, number>
  /** The rows themselves, for callers that need a slug rather than a name. */
  subjects: ReferenceSubject[]
  topics: ReferenceTopic[]
}

const EMPTY: Reference = {
  tasks: [],
  subjectById: {},
  topicById: {},
  topicPositionById: {},
  subjects: [],
  topics: [],
}

/**
 * Written once, used by both loaders. `official_solution` is not in it: that
 * column is the one thing not for the student's eyes, and a cache shared
 * across users is the last place it belongs. The grader reads it separately,
 * per attempt, on the server.
 *
 * The second sort key is there because paging needs a total order — two
 * problems of the same difficulty could otherwise swap places between pages
 * and one of them would be fetched twice while the other was missed.
 */
const TASK_COLUMNS =
  'id, subject_id, topic_id, title, problem, difficulty, hints, source, estimated_minutes, given, find_prompt, diagram_url, source_url, licence, attribution, level, paper'

/**
 * Unwraps a PostgREST response, turning a failed query into a throw.
 *
 * supabase-js does not throw on a query error: it hands back `{ data: null,
 * error }`, and `data ?? []` quietly becomes an empty catalogue. Cached, that
 * is a screen saying the student has no subject and a picker with nothing in
 * it, for as long as the entry lives — and a migration causes exactly this,
 * because PostgREST reloads its schema cache on DDL and rejects a request or
 * two while it does.
 *
 * Throwing instead means `unstable_cache` stores nothing, so the next request
 * tries again rather than being served an empty library, and the catch in
 * getReference is finally the thing it says it is: the one place that can tell
 * a broken query from an empty one.
 */
function rows<T>(what: string, result: { data: T[] | null; error: { message: string } | null }): T[] {
  if (result.error) throw new Error(`${what}: ${result.error.message}`)
  return result.data ?? []
}

/**
 * PostgREST stops at a thousand rows.
 *
 * Not an error, not a warning — a full response that happens to be short, and
 * `data.length` is the only thing that says so. The catalogue passed a
 * thousand problems in September and nobody noticed: the database held 1779
 * and the app had 1000, so 779 problems were missing from the bank, missing
 * from every route through a subject, unreachable by URL, and invisible to the
 * mock composer. The counts that said otherwise were SQL counts.
 *
 * So every table that can grow past a thousand rows is read a page at a time
 * until a page comes back short. A page that is exactly full is followed by
 * one more request that returns nothing, which is the price of not guessing.
 */
const PAGE = 1000

async function allRows<T>(
  what: string,
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const batch = rows(what, await page(from, from + PAGE - 1))
    out.push(...batch)
    if (batch.length < PAGE) return out
  }
}

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
    const [taskRows, subjectRows, topicRows] = await Promise.all([
      allRows<ReferenceTask>('tasks', (from, to) =>
        admin
          .from('tasks')
          .select(TASK_COLUMNS)
          .order('difficulty', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      admin.from('subjects').select('id, name, slug').eq('active', true),
      admin.from('topics').select('id, subject_id, name, slug, position').order('position'),
    ])

    return shape(
      taskRows,
      rows('subjects', subjectRows) as ReferenceSubject[],
      rows('topics', topicRows) as ReferenceTopic[],
    )
  },
  // The suffix is the manual bust. Nothing in the app writes this content —
  // it arrives by migration, which Next cannot know about — so bumping the key
  // is how you invalidate it everywhere at once.
  ['olympai-reference-content-v5'],
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
  const [taskRows, subjectRows, topicRows] = await Promise.all([
    allRows<ReferenceTask>('tasks', (from, to) =>
      supabase
        .from('tasks')
        .select(TASK_COLUMNS)
        .order('difficulty', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    supabase.from('subjects').select('id, name, slug').eq('active', true),
    supabase.from('topics').select('id, subject_id, name, slug, position').order('position'),
  ])

  return shape(
    taskRows,
    rows('subjects', subjectRows) as ReferenceSubject[],
    rows('topics', topicRows) as ReferenceTopic[],
  )
}

/**
 * The two loaders differ only in which client they use.
 *
 * A hidden subject is filtered out of `subjects`, and its topics and problems
 * have to go with it — otherwise a task whose subject nobody can see still
 * turns up in the catalogue, filed under "General". Filtering here rather than
 * at each caller means one place decides what exists, which is what this cache
 * was for.
 */
function shape(
  tasks: ReferenceTask[],
  subjects: ReferenceSubject[],
  topics: ReferenceTopic[],
): Reference {
  const visible = new Set(subjects.map((row) => row.id))
  const liveTopics = topics.filter((row) => visible.has(row.subject_id))
  const liveTopicIds = new Set(liveTopics.map((row) => row.id))
  const liveTasks = tasks.filter(
    (row) => visible.has(row.subject_id) && liveTopicIds.has(row.topic_id),
  )

  return {
    tasks: liveTasks,
    subjectById: Object.fromEntries(subjects.map((row) => [row.id, row.name])),
    topicById: Object.fromEntries(liveTopics.map((row) => [row.id, row.name])),
    topicPositionById: Object.fromEntries(liveTopics.map((row) => [row.id, row.position])),
    subjects,
    topics: liveTopics,
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
    const [lessons, blocks, questions, cards] = await Promise.all([
      allRows<ReferenceLesson>('lessons', (from, to) =>
        admin.from('lessons').select(STUDY_COLUMNS.lessons).order('position').order('id').range(from, to),
      ),
      allRows<ReferenceLessonBlock>('lesson_blocks', (from, to) =>
        admin.from('lesson_blocks').select(STUDY_COLUMNS.blocks).order('position').order('id').range(from, to),
      ),
      allRows<ReferenceQuizQuestion>('quiz_questions', (from, to) =>
        admin.from('quiz_questions').select(STUDY_COLUMNS.questions).order('position').order('id').range(from, to),
      ),
      allRows<ReferenceFlashcard>('flashcards', (from, to) =>
        admin
          .from('flashcards')
          .select(STUDY_COLUMNS.cards)
          .is('user_id', null)
          .order('position')
          .order('id')
          .range(from, to),
      ),
    ])

    return { lessons, blocks, questions, cards }
  },
  ['olympai-study-content-v3'],
  { revalidate: 60, tags: ['study-content'] },
)

async function loadStudyReferenceAsUser(): Promise<StudyReference> {
  const supabase = await createClient()
  const [lessons, blocks, questions, cards] = await Promise.all([
    allRows<ReferenceLesson>('lessons', (from, to) =>
      supabase.from('lessons').select(STUDY_COLUMNS.lessons).order('position').order('id').range(from, to),
    ),
    allRows<ReferenceLessonBlock>('lesson_blocks', (from, to) =>
      supabase.from('lesson_blocks').select(STUDY_COLUMNS.blocks).order('position').order('id').range(from, to),
    ),
    allRows<ReferenceQuizQuestion>('quiz_questions', (from, to) =>
      supabase.from('quiz_questions').select(STUDY_COLUMNS.questions).order('position').order('id').range(from, to),
    ),
    allRows<ReferenceFlashcard>('flashcards', (from, to) =>
      supabase
        .from('flashcards')
        .select(STUDY_COLUMNS.cards)
        .is('user_id', null)
        .order('position')
        .order('id')
        .range(from, to),
    ),
  ])

  return { lessons, blocks, questions, cards }
}

export async function getStudyReference(): Promise<StudyReference> {
  try {
    return hasSupabaseSecretKey() ? await loadStudyReference() : await loadStudyReferenceAsUser()
  } catch (cause) {
    console.error('[study] falling back to empty study content:', cause)
    return EMPTY_STUDY
  }
}
