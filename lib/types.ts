import type { Database } from '@/lib/supabase/database.types'

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
