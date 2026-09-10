'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseSecretKey } from '@/lib/supabase/secret-env'
import type { Rating } from '@/lib/srs'
import { quizAnswerXp } from '@/lib/xp'

export type ActionResult = { ok: boolean; error?: string }

const MAX_FRONT = 300
const MAX_BACK = 1_000

/**
 * Marking a quiz answer.
 *
 * The same rule the grader follows, for the same reason: `correct_index` is
 * read here, on the server, and the row recording what happened is written
 * with the service role. RLS grants `authenticated` no insert on quiz_attempts,
 * so an answer the browser marked itself is not a thing that can exist.
 *
 * The explanation travels back with the verdict rather than with the question,
 * so it is in the client's hands only once a choice has been committed.
 */
export type QuizAnswer =
  | {
      ok: true
      isCorrect: boolean
      correctIndex: number
      explanation: string
      /** What this answer earned. Zero on a question already answered. */
      xpEarned: number
    }
  | { ok: false; error: string }

export async function answerQuizQuestion(
  questionId: string,
  chosenIndex: number,
): Promise<QuizAnswer> {
  if (!Number.isInteger(chosenIndex) || chosenIndex < 0) {
    return { ok: false, error: 'Choose one of the options.' }
  }

  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }
  if (!hasSupabaseSecretKey()) {
    return { ok: false, error: 'Quizzes are not configured on this server.' }
  }

  // Service role, because the answer key is not readable by `authenticated`:
  // correct_index and explanation were revoked from the browser's role in
  // migration 0022. Questions are shared reference content, identical for
  // everyone, so there is no per-user scoping to lose by reading them here.
  const admin = createAdminClient()
  const { data: question } = await admin
    .from('quiz_questions')
    .select('id, options, correct_index, explanation, topic_id')
    .eq('id', questionId)
    .maybeSingle()
  if (!question) return { ok: false, error: 'That question is no longer available.' }

  if (chosenIndex >= question.options.length) {
    return { ok: false, error: 'Choose one of the options.' }
  }

  const isCorrect = chosenIndex === question.correct_index

  // Read before writing, so "first attempt" and "first correct" mean what they
  // say. The same shape as the grader deciding whether a task was already
  // solved before it prices the attempt.
  const { data: prior } = await admin
    .from('quiz_attempts')
    .select('is_correct')
    .eq('user_id', user.id)
    .eq('question_id', question.id)
  const xpEarned = quizAnswerXp({
    attemptedBefore: (prior ?? []).length > 0,
    solvedBefore: (prior ?? []).some((row) => row.is_correct),
    isCorrect,
  })

  const { error } = await admin.from('quiz_attempts').insert({
    user_id: user.id,
    question_id: question.id,
    chosen_index: chosenIndex,
    is_correct: isCorrect,
  })
  if (error) return { ok: false, error: 'Your answer could not be saved. Please try again.' }

  revalidatePath('/learn')

  return {
    ok: true,
    isCorrect,
    correctIndex: question.correct_index,
    explanation: question.explanation,
    xpEarned,
  }
}

/**
 * Opening and finishing a lesson.
 *
 * Both are the student's own account of their own reading, they pay no XP and
 * unlock nothing, so they go through the caller's session under RLS rather
 * than through the service role.
 */
export async function markLessonOpened(lessonId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }

  // onConflict keeps the original opened_at: the first time is the interesting
  // one, and overwriting it would turn "started this a week ago" into "just now".
  const { error } = await supabase
    .from('lesson_views')
    .upsert(
      { user_id: user.id, lesson_id: lessonId },
      { onConflict: 'user_id,lesson_id', ignoreDuplicates: true },
    )
  if (error) return { ok: false, error: 'Could not record that you opened this lesson.' }
  return { ok: true }
}

export async function setLessonComplete(
  lessonId: string,
  complete: boolean,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }

  const { error } = await supabase.from('lesson_views').upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      completed_at: complete ? new Date().toISOString() : null,
    },
    { onConflict: 'user_id,lesson_id' },
  )
  if (error) return { ok: false, error: 'Could not save that. Please try again.' }

  revalidatePath('/learn')
  revalidatePath(`/learn`)
  return { ok: true }
}

/**
 * Recording a card review.
 *
 * The rating is the student's own judgement of their own recall — there is
 * nothing to verify and nothing to win — so RLS is the whole check. The card
 * is looked up through their session first, which is what stops a review being
 * filed against a card they cannot see.
 */
export async function reviewCard(cardId: string, rating: Rating): Promise<ActionResult> {
  if (![0, 1, 2, 3].includes(rating)) return { ok: false, error: 'Unknown rating.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }

  const { data: card } = await supabase
    .from('flashcards')
    .select('id')
    .eq('id', cardId)
    .maybeSingle()
  if (!card) return { ok: false, error: 'That card is no longer available.' }

  const { error } = await supabase
    .from('flashcard_reviews')
    .insert({ user_id: user.id, card_id: card.id, rating })
  if (error) return { ok: false, error: 'Your review could not be saved.' }

  revalidatePath('/learn')
  return { ok: true }
}

/** A card the student writes for themselves. Private, and theirs to delete. */
export async function createCard(
  topicId: string,
  front: string,
  back: string,
): Promise<ActionResult> {
  const cleanFront = front.trim()
  const cleanBack = back.trim()
  if (!cleanFront || !cleanBack) return { ok: false, error: 'Both sides need something on them.' }
  if (cleanFront.length > MAX_FRONT || cleanBack.length > MAX_BACK) {
    return { ok: false, error: 'That is longer than a card should be. Split it into two.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }

  const { error } = await supabase.from('flashcards').insert({
    topic_id: topicId,
    user_id: user.id,
    front: cleanFront,
    back: cleanBack,
    // Written by the student, for themselves, and never shown to anyone else.
    // The database trigger would settle on the same value; saying it here
    // means the row does not depend on that to be correct.
    licence: 'original',
  })
  if (error) return { ok: false, error: 'The card could not be saved. Please try again.' }

  revalidatePath('/learn')
  return { ok: true }
}

export async function deleteCard(cardId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }

  // The RLS delete policy is scoped to own cards, so a shared card or someone
  // else's is simply not matched.
  const { error } = await supabase.from('flashcards').delete().eq('id', cardId).eq('user_id', user.id)
  if (error) return { ok: false, error: 'The card could not be removed.' }

  revalidatePath('/learn')
  return { ok: true }
}
