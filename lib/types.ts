import type { Database } from '@/lib/supabase/database.types'
import type { LadderInput, LadderStage } from '@/lib/ladder'
import type { CardState } from '@/lib/srs'
import type { FigureSpec } from '@/lib/figures'

/**
 * View models shared between the server queries that build them and the
 * components that render them.
 *
 * They live here rather than in lib/supabase/queries.ts so a `'use client'`
 * module never imports — even for a type — a file marked `server-only`.
 */
export type Profile = Database['public']['Tables']['profiles']['Row']

export type ProgressAnalytics = {
  hasData: boolean
  totalAttempts: number
  correctAnswers: number
  accuracy: number
  activeStreak: number
  /** Longest run of consecutive correct attempts, oldest to newest. */
  longestCorrectRun: number
  currentLevel: string | null
  recentActivity: { day: string; problems: number }[]
  /** Accuracy per calendar week, oldest first. Only weeks with attempts appear. */
  accuracyTrend: { label: string; accuracy: number }[]
  topics: { topic: string; mastery: number; attempts: number; correct: number }[]
  weakTopics: string[]
  strongTopics: string[]
  recentMistakes: string[]
  /** Derived from attempts on every read — see lib/xp.ts. */
  xp: {
    total: number
    today: number
    goal: number
    level: number
    intoLevel: number
    levelSpan: number
    levelPercent: number
    toNextLevel: number
  }
}

export type CatalogueTask = {
  id: string
  title: string
  subject: string
  topic: string
  difficulty: number
  estimatedMinutes: number | null
  source: string | null
  solved: boolean
  attempts: number
}

export type TaskDetail = CatalogueTask & {
  problem: string
  given: string[]
  findPrompt: string | null
  diagramUrl: string | null
  hints: string[]
  bestScore: number | null
  /** Where the statement came from, and what may be done with it. */
  sourceUrl: string | null
  licence: string
  attribution: string | null
}

export type ChatSessionSummary = {
  id: string
  title: string
  createdAt: string
  lastMessageAt: string | null
  preview: string | null
}

export type StoredMessage = { id: string; role: 'user' | 'assistant'; content: string }

export type Competition = {
  id: string
  name: string
  subject: string | null
  level: string | null
  /** Null for catalogue entries: the date belongs to the student's own goal. */
  startsOn: string | null
  endsOn: string | null
  registrationUrl: string | null
  registrationDeadline: string | null
  registered: boolean
  /** Accuracy in this competition's subject, or null when nothing was attempted there. */
  readiness: number | null
}

export type CompetitionOption = {
  id: string
  name: string
  level: string | null
  subjectId: string | null
  subjectName: string | null
  registrationUrl: string | null
  /** Tasks available in the competition's subject. */
  taskCount: number
}

export type Goal = {
  competition: CompetitionOption | null
  subjectId: string | null
  subjectName: string | null
  targetDate: string | null
  /** True when the competition dictates the subject, so it cannot be changed. */
  subjectLocked: boolean
}

// ------------------------------------------------------------- learning ---
// The ladder's view models. Here rather than in lib/supabase/study.ts for the
// reason given at the top of this file: the quiz runner and the card deck are
// client components, and a `'use client'` module must not reach into a
// `server-only` one even for a type.

export type LessonBlock = {
  id: string
  kind: 'concept' | 'explanation' | 'example' | 'key_facts'
  heading: string | null
  body: string | null
  items: string[]
  /** Null when the block has no figure, or when its parameters did not parse. */
  figure: FigureSpec | null
}

export type Lesson = {
  id: string
  topicSlug: string
  topicName: string
  subjectName: string
  title: string
  summary: string | null
  estimatedMinutes: number | null
  blocks: LessonBlock[]
  openedAt: string | null
  completedAt: string | null
  licence: string
  attribution: string | null
  sourceUrl: string | null
}

export type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  /** What this student has already done with it, if anything. */
  lastChoice: number | null
  lastCorrect: boolean | null
}

export type TopicQuiz = {
  topicSlug: string
  topicName: string
  subjectName: string
  questions: QuizQuestion[]
  correct: number
}

export type StudyCard = {
  id: string
  front: string
  back: string
  /** True for a card this student wrote, which they may edit or delete. */
  own: boolean
  attribution: string | null
  licence: string | null
  state: CardState
  due: boolean
}

export type TopicCards = {
  topicId: string
  topicSlug: string
  topicName: string
  subjectName: string
  cards: StudyCard[]
  dueCount: number
  learnedCount: number
}

export type TopicLadder = {
  id: string
  slug: string
  name: string
  subjectName: string
  subjectSlug: string
  stages: LadderStage[]
  /** The figures the stages were built from, for lib/next-action.ts. */
  input: LadderInput
  percent: number
  next: LadderStage | null
}

export type SubjectStudy = {
  name: string
  slug: string
  topics: TopicLadder[]
  percent: number
}

/**
 * What /learn renders: the subjects in scope, plus what was left out and why.
 *
 * Scoping is never silent. A student looking at three physics topics has to be
 * able to see that the other six subjects exist and are one click away.
 */
export type StudySurface = {
  subjects: SubjectStudy[]
  /** The subject the target implies, from getGoal(). */
  goalSubject: string | null
  /** True when the list has been narrowed to that subject. */
  scoped: boolean
  /** How many subjects are being held back by the scoping. */
  hiddenSubjects: number
}
