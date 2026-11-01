import 'server-only'

import { cache } from 'react'
import { getSessionUserId } from '@/lib/supabase/auth'
import { getReference, getStudyReference } from '@/lib/supabase/reference'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { buildCardsAside, buildLadder, ladderPercent, nextStep } from '@/lib/ladder'
import { nextAction, type NextAction } from '@/lib/next-action'
import { recommendTask } from '@/lib/recommendations'
import { getGoal, getProgressAnalytics, getTaskCatalogue } from '@/lib/supabase/queries'
import { cardState, isDue, isLearned, orderForReview, type Rating } from '@/lib/srs'
import { parseFigure } from '@/lib/figures'
import { getT } from '@/lib/i18n'
import type {
  Lesson,
  LessonBlock,
  QuizQuestion,
  StudyCard,
  StudySurface,
  SubjectStudy,
  TopicCards,
  TopicLadder,
  TopicQuiz,
} from '@/lib/types'

export type {
  Lesson,
  LessonBlock,
  QuizQuestion,
  StudyCard,
  StudySurface,
  SubjectStudy,
  TopicCards,
  TopicLadder,
  TopicQuiz,
} from '@/lib/types'
export type { NextAction } from '@/lib/next-action'

/**
 * Reads behind the learning ladder.
 *
 * Kept out of queries.ts, which is already the whole of the practice side. The
 * split is by feature rather than by table because the two share only the task
 * catalogue, and that arrives through the reference cache either way.
 *
 * Every per-user query in here is wrapped in `cache`, so a page that renders
 * the ladder, the lesson and the card count pays for one round trip each.
 */

/** Everything personal the ladder needs, in four queries for the whole render. */
const getStudyProgress = cache(async () => {
  const userId = await getSessionUserId()
  if (!userId) {
    return { userId: null, quiz: [], reviews: [], views: [], ownCards: [], attempts: [] }
  }

  const supabase = await createClient()
  const [{ data: quiz }, { data: reviews }, { data: views }, { data: ownCards }, { data: attempts }] =
    await Promise.all([
      supabase.from('quiz_attempts').select('question_id, chosen_index, is_correct, created_at'),
      supabase.from('flashcard_reviews').select('card_id, rating, created_at'),
      supabase.from('lesson_views').select('lesson_id, opened_at, completed_at'),
      supabase
        .from('flashcards')
        .select('id, topic_id, front, back, position, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      supabase.from('task_attempts').select('task_id, is_correct'),
    ])

  return {
    userId,
    quiz: quiz ?? [],
    reviews: reviews ?? [],
    views: views ?? [],
    ownCards: ownCards ?? [],
    attempts: attempts ?? [],
  }
})

/**
 * The most recent answer to each question.
 *
 * Used by both the ladder and the quiz page, so the two cannot drift apart
 * again — which is what happened when each counted for itself.
 */
function latestAnswers(rows: { question_id: string; chosen_index: number; is_correct: boolean; created_at: string }[]) {
  const latest = new Map<string, { chosen_index: number; is_correct: boolean }>()
  for (const row of [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    latest.set(row.question_id, { chosen_index: row.chosen_index, is_correct: row.is_correct })
  }
  return latest
}

/** Review history per card, oldest first, ready for lib/srs.ts. */
function reviewsByCard(reviews: { card_id: string; rating: number; created_at: string }[]) {
  const map = new Map<string, { rating: Rating; createdAt: string }[]>()
  for (const review of reviews) {
    const list = map.get(review.card_id) ?? []
    list.push({ rating: Math.min(3, Math.max(0, review.rating)) as Rating, createdAt: review.created_at })
    map.set(review.card_id, list)
  }
  return map
}

type OrderedTopic = TopicLadder & { order: number }

async function buildTopicLadders(): Promise<OrderedTopic[]> {
  if (!hasSupabaseEnv()) return []

  const [reference, study, progress, mocks, t] = await Promise.all([
    getReference(),
    getStudyReference(),
    getStudyProgress(),
    getMockCountsBySubject(),
    getT(),
  ])

  const solvedTasks = new Set(
    progress.attempts.filter((row) => row.is_correct).map((row) => row.task_id),
  )
  // The latest answer, not the best one. The ladder used to count a question as
  // right if it had ever been right, while the quiz page showed the most recent
  // attempt — so a student who re-ran a quiz and slipped saw "6 of 6 right" on
  // the topic and a red cross inside it.
  const correctQuestions = new Set(
    [...latestAnswers(progress.quiz)]
      .filter(([, row]) => row.is_correct)
      .map(([questionId]) => questionId),
  )
  const answeredQuestions = new Set(progress.quiz.map((row) => row.question_id))
  const viewByLesson = new Map(progress.views.map((row) => [row.lesson_id, row]))
  const history = reviewsByCard(progress.reviews)
  const now = new Date()

  const tasksBySubject = new Map<string, number>()
  for (const task of reference.tasks) {
    tasksBySubject.set(task.subject_id, (tasksBySubject.get(task.subject_id) ?? 0) + 1)
  }

  return reference.topics.map((topic) => {
    const subject = reference.subjects.find((item) => item.id === topic.subject_id)
    const subjectName = subject?.name ?? 'Practice'

    const lesson = study.lessons.find((item) => item.topic_id === topic.id) ?? null
    const view = lesson ? viewByLesson.get(lesson.id) : undefined
    const blocks = lesson ? study.blocks.filter((block) => block.lesson_id === lesson.id).length : 0

    const questions = study.questions.filter((item) => item.topic_id === topic.id)
    const cards = [
      ...study.cards.filter((item) => item.topic_id === topic.id),
      ...progress.ownCards.filter((item) => item.topic_id === topic.id),
    ]
    const cardStates = cards.map((card) => cardState(history.get(card.id) ?? []))
    const tasks = reference.tasks.filter((task) => task.topic_id === topic.id)

    const input = {
      topicSlug: topic.slug,
      topicName: topic.name,
      subjectName,
      lesson: lesson
        ? {
            id: lesson.id,
            blocks,
            minutes: lesson.estimated_minutes,
            opened: Boolean(view),
            completed: Boolean(view?.completed_at),
          }
        : null,
      quiz: {
        total: questions.length,
        correct: questions.filter((item) => correctQuestions.has(item.id)).length,
        answered: questions.filter((item) => answeredQuestions.has(item.id)).length,
      },
      cards: {
        total: cards.length,
        learned: cardStates.filter(isLearned).length,
        due: cardStates.filter((state) => isDue(state, now)).length,
      },
      tasks: {
        total: tasks.length,
        solved: tasks.filter((task) => solvedTasks.has(task.id)).length,
      },
      mocks: {
        taken: mocks.get(subjectName)?.taken ?? 0,
        bestPercent: mocks.get(subjectName)?.best ?? null,
        subjectEligible: (tasksBySubject.get(topic.subject_id) ?? 0) >= 3,
      },
    }
    const stages = buildLadder(input, t)

    return {
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      subjectName,
      subjectSlug: subject?.slug ?? '',
      stages,
      cards: buildCardsAside(input, t),
      input,
      percent: ladderPercent(stages),
      next: nextStep(stages),
      // Ordering key, dropped before the result leaves this module.
      order: topic.position,
    }
  })
}

/*
 * Topics run in the syllabus order (`topics.position`, migration 44), which is
 * the same key lib/path.ts sorts its stages by. They used to be ordered by the
 * mean difficulty of their problems — so /learn and /tasks agreed only as long
 * as no import shifted an average, and the sequence a student was taught was a
 * property of what had been imported last.
 */

/** Papers sat per subject. Read here rather than through queries.ts to keep
 *  the ladder's dependencies to the reference cache and one session. */
const getMockCountsBySubject = cache(async () => {
  const counts = new Map<string, { taken: number; best: number | null }>()
  const userId = await getSessionUserId()
  if (!userId) return counts

  const [reference, supabase] = await Promise.all([getReference(), createClient()])
  const { data } = await supabase
    .from('mock_tests')
    .select('subject_id, score_percent, submitted_at')
    .not('submitted_at', 'is', null)

  for (const row of data ?? []) {
    const name = reference.subjectById[row.subject_id] ?? 'Practice'
    const current = counts.get(name) ?? { taken: 0, best: null }
    counts.set(name, {
      taken: current.taken + 1,
      best: Math.max(current.best ?? 0, row.score_percent ?? 0),
    })
  }
  return counts
})

/** Topics of the subject the target implies, easiest first. */
const getFocusTopics = cache(async (): Promise<{ subject: string | null; topics: OrderedTopic[] }> => {
  const [ladders, goal] = await Promise.all([buildTopicLadders(), getGoal()])
  const subject = goal.subjectName
  if (!subject) return { subject: null, topics: [] }
  return {
    subject,
    topics: ladders
      .filter((topic) => topic.subjectName === subject)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
  }
})

/**
 * The one instruction both /learn and /tasks lead with.
 *
 * Always about the target subject, never about whatever happens to be on
 * screen: opening the full catalogue to look something up should not change
 * what the app says you ought to be doing.
 */
export const getNextAction = cache(async (): Promise<NextAction> => {
  const [{ subject, topics }, catalogue, analytics, t] = await Promise.all([
    getFocusTopics(),
    getTaskCatalogue(),
    getProgressAnalytics(),
    getT(),
  ])

  const pick = subject
    ? recommendTask(
        catalogue.filter((task) => task.subject === subject),
        analytics,
      )
    : null

  return nextAction(
    subject,
    topics.map((topic) => ({
      slug: topic.slug,
      name: topic.name,
      input: topic.input,
      stages: topic.stages,
      percent: topic.percent,
    })),
    pick
      ? {
          id: pick.id,
          title: pick.title,
          topic: pick.topic,
          difficulty: pick.difficulty,
          estimatedMinutes: pick.estimatedMinutes,
        }
      : null,
    t,
  )
})

export type SkillShape = {
  subject: string | null
  /** In the order the student meets them, so neighbouring axes are neighbours. */
  topics: { topic: string; mastery: number }[]
  /** The ones below the line, weakest first, for the sentence under the chart. */
  weak: string[]
}

/** Below this a topic is where the next session should go. */
const WEAK_BELOW = 70

/**
 * The shape of the subject: every topic in the target, and how far it has been
 * taken through the ladder.
 *
 * Built from the ladder rather than from graded attempts, which is what the
 * dashboard used to draw. Attempts only exist once a student has submitted a
 * derivation, so an account three lessons and two quizzes in had no topics at
 * all and the chart was simply absent — at exactly the point in a student's
 * first week where seeing the outline start to fill in is the whole reward.
 *
 * A topic at nought is drawn at nought. That is a fact about the plan, not an
 * invented figure, and the collapsed side of the shape is the point.
 */
export const getSkillShape = cache(async (): Promise<SkillShape> => {
  const focus = await getFocusTopics()
  const t = await getT()
  const topics = focus.topics.map((topic) => ({
    topic: t.topics[topic.name] ?? topic.name,
    mastery: topic.percent,
  }))

  return {
    subject: focus.subject,
    topics,
    weak: topics
      .filter((topic) => topic.mastery < WEAK_BELOW)
      .sort((a, b) => a.mastery - b.mastery)
      .map((topic) => topic.topic),
  }
})

function groupBySubject(topics: TopicLadder[]): SubjectStudy[] {
  const bySubject = new Map<string, SubjectStudy>()

  for (const topic of topics) {
    const existing = bySubject.get(topic.subjectName)
    if (existing) existing.topics.push(topic)
    else {
      bySubject.set(topic.subjectName, {
        name: topic.subjectName,
        slug: topic.subjectSlug,
        topics: [topic],
        percent: 0,
      })
    }
  }

  return [...bySubject.values()]
    .map((subject) => ({
      ...subject,
      percent: Math.round(
        subject.topics.reduce((sum, topic) => sum + topic.percent, 0) / subject.topics.length,
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * The topic list, narrowed to the subject the student is training for.
 *
 * Seven subjects of material for someone preparing for one of them is not a
 * library, it is noise — and the six they are not studying push the one they
 * are off the screen. `all` is the way back, and the page always says how many
 * subjects are being held back, so the narrowing is visible rather than felt.
 */
export const getStudyOverview = cache(async (all = false): Promise<StudySurface> => {
  const [ladders, focus] = await Promise.all([buildTopicLadders(), getFocusTopics()])
  const everything = groupBySubject(ladders)

  if (all || !focus.subject || focus.topics.length === 0) {
    return {
      subjects: everything,
      goalSubject: focus.subject,
      scoped: false,
      hiddenSubjects: 0,
    }
  }

  const scoped = groupBySubject(focus.topics)
  return {
    subjects: scoped,
    goalSubject: focus.subject,
    scoped: true,
    hiddenSubjects: everything.length - scoped.length,
  }
})

export const getTopicLadder = cache(async (slug: string): Promise<TopicLadder | null> => {
  const ladders = await buildTopicLadders()
  return ladders.find((topic) => topic.slug === slug) ?? null
})

// ------------------------------------------------------------------ lesson ---

export const getLesson = cache(async (topicSlug: string): Promise<Lesson | null> => {
  if (!hasSupabaseEnv()) return null

  const [reference, study, progress] = await Promise.all([
    getReference(),
    getStudyReference(),
    getStudyProgress(),
  ])

  const topic = reference.topics.find((item) => item.slug === topicSlug)
  if (!topic) return null
  const lesson = study.lessons.find((item) => item.topic_id === topic.id)
  if (!lesson) return null

  const view = progress.views.find((row) => row.lesson_id === lesson.id)

  return {
    id: lesson.id,
    topicSlug: topic.slug,
    topicName: topic.name,
    subjectName: reference.subjectById[topic.subject_id] ?? 'Practice',
    title: lesson.title,
    summary: lesson.summary,
    estimatedMinutes: lesson.estimated_minutes,
    blocks: study.blocks
      .filter((block) => block.lesson_id === lesson.id)
      .sort((a, b) => a.position - b.position)
      .map((block) => ({
        id: block.id,
        kind: block.kind,
        heading: block.heading,
        body: block.body,
        items: block.items,
        // Parsed here rather than in the component: a figure whose parameters
        // are wrong should be absent from the page, not throw during a render.
        figure: parseFigure(block.visual_kind, block.visual),
      })),
    openedAt: view?.opened_at ?? null,
    completedAt: view?.completed_at ?? null,
    licence: lesson.licence,
    attribution: lesson.attribution,
    sourceUrl: lesson.source_url,
  }
})

// -------------------------------------------------------------------- quiz ---

export const getTopicQuiz = cache(async (topicSlug: string): Promise<TopicQuiz | null> => {
  if (!hasSupabaseEnv()) return null

  const [reference, study, progress] = await Promise.all([
    getReference(),
    getStudyReference(),
    getStudyProgress(),
  ])

  const topic = reference.topics.find((item) => item.slug === topicSlug)
  if (!topic) return null

  const latest = latestAnswers(progress.quiz)

  const questions = study.questions
    .filter((item) => item.topic_id === topic.id)
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      prompt: item.prompt,
      options: item.options,
      lastChoice: latest.get(item.id)?.chosen_index ?? null,
      lastCorrect: latest.get(item.id)?.is_correct ?? null,
    }))

  return {
    topicSlug: topic.slug,
    topicName: topic.name,
    subjectName: reference.subjectById[topic.subject_id] ?? 'Practice',
    questions,
    correct: questions.filter((question) => question.lastCorrect).length,
  }
})

// -------------------------------------------------------------------- cards ---

export const getTopicCards = cache(async (topicSlug: string): Promise<TopicCards | null> => {
  if (!hasSupabaseEnv()) return null

  const [reference, study, progress] = await Promise.all([
    getReference(),
    getStudyReference(),
    getStudyProgress(),
  ])

  const topic = reference.topics.find((item) => item.slug === topicSlug)
  if (!topic) return null

  const history = reviewsByCard(progress.reviews)
  const now = new Date()

  const shared = study.cards
    .filter((card) => card.topic_id === topic.id)
    .map((card) => ({
      id: card.id,
      front: card.front,
      back: card.back,
      own: false,
      attribution: card.attribution,
      licence: card.licence,
    }))

  const mine = progress.ownCards
    .filter((card) => card.topic_id === topic.id)
    .map((card) => ({
      id: card.id,
      front: card.front,
      back: card.back,
      own: true,
      attribution: null,
      licence: null,
    }))

  const entries = [...shared, ...mine].map((card) => ({
    card,
    state: cardState(history.get(card.id) ?? []),
  }))

  const cards: StudyCard[] = orderForReview(entries, now).map(({ card, state }) => ({
    ...card,
    state,
    due: isDue(state, now),
  }))

  return {
    topicId: topic.id,
    topicSlug: topic.slug,
    topicName: topic.name,
    subjectName: reference.subjectById[topic.subject_id] ?? 'Practice',
    cards,
    dueCount: cards.filter((card) => card.due).length,
    learnedCount: cards.filter((card) => isLearned(card.state)).length,
  }
})

// ---------------------------------------------------------------- shortcut ---

export type TopicShortcut = {
  slug: string
  name: string
  lessonTitle: string | null
  quizLeft: number
  quizTotal: number
  cardsDue: number
  cardsTotal: number
}

/**
 * The way back from a problem to the material behind it.
 *
 * A student stuck on a derivation has somewhere to go that is not the coach:
 * the notes for the topic, the questions, the cards. Without this the task page
 * is a dead end with a text box, which is how /tasks and /learn came to feel
 * like two separate products.
 */
export const getTopicShortcut = cache(
  async (topicName: string): Promise<TopicShortcut | null> => {
    if (!hasSupabaseEnv()) return null
    const ladders = await buildTopicLadders()
    const topic = ladders.find((item) => item.name === topicName)
    if (!topic) return null

    const study = await getStudyReference()
    const lesson = topic.input.lesson
      ? (study.lessons.find((item) => item.id === topic.input.lesson?.id)?.title ?? null)
      : null

    return {
      slug: topic.slug,
      name: topic.name,
      lessonTitle: lesson,
      quizLeft: topic.input.quiz.total - topic.input.quiz.correct,
      quizTotal: topic.input.quiz.total,
      cardsDue: topic.input.cards.due,
      cardsTotal: topic.input.cards.total,
    }
  },
)
