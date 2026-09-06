'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseSecretKey } from '@/lib/supabase/secret-env'
import { checkAttemptRateLimit } from '@/lib/rate-limit'
import { gradeAttempt } from '@/lib/sulu/grade'
import { SuluError } from '@/lib/sulu/provider'
import { attemptXp } from '@/lib/xp'
import { composeMock, scoreMock } from '@/lib/mock'
import { getTaskCatalogue } from '@/lib/supabase/queries'

export type MockResult = { ok: boolean; error?: string }

const MIN_ANSWER_LENGTH = 20
const MAX_ANSWER_LENGTH = 8_000
/** Answers arriving well past the clock are still graded, but flagged. */
const GRACE_MINUTES = 5

/**
 * Starts a paper.
 *
 * The question set is chosen and written server-side with the service role:
 * a client that could compose its own test could compose an easy one, and the
 * level it produced would be worthless.
 */
export async function startMock(subjectName: string): Promise<MockResult> {
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }
  if (!hasSupabaseSecretKey()) {
    return { ok: false, error: 'Mock tests are not configured on this server.' }
  }

  const supabase = await createClient()
  const { data: subject } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('name', subjectName)
    .maybeSingle()
  if (!subject) return { ok: false, error: 'That subject is no longer available.' }

  // An unfinished paper is resumed rather than replaced.
  const { data: open } = await supabase
    .from('mock_tests')
    .select('id')
    .eq('user_id', user.id)
    .is('submitted_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (open) redirect(`/mock/${open.id}`)

  const catalogue = await getTaskCatalogue()
  const blueprint = composeMock(catalogue.filter((task) => task.subject === subject.name))
  if (!blueprint) {
    return { ok: false, error: 'This subject needs at least three tasks before a mock test.' }
  }

  const admin = createAdminClient()
  const { data: created, error } = await admin
    .from('mock_tests')
    .insert({
      user_id: user.id,
      subject_id: subject.id,
      task_ids: blueprint.taskIds,
      duration_minutes: blueprint.durationMinutes,
    })
    .select('id')
    .single()
  if (error || !created) return { ok: false, error: 'The test could not be started.' }

  revalidatePath('/mock')
  redirect(`/mock/${created.id}`)
}

/**
 * Grades a finished paper.
 *
 * Every answer is graded by the same model that grades practice, in parallel,
 * and each becomes an ordinary task_attempt tagged with this test — so a mock
 * counts toward mastery, XP and the path exactly once, with no special case in
 * the analytics.
 */
export async function submitMock(testId: string, answers: Record<string, string>): Promise<MockResult> {
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }
  if (!hasSupabaseSecretKey()) {
    return { ok: false, error: 'Grading is not configured on this server.' }
  }

  const supabase = await createClient()
  const { data: test } = await supabase
    .from('mock_tests')
    .select('id, user_id, task_ids, submitted_at, started_at, duration_minutes')
    .eq('id', testId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!test) return { ok: false, error: 'That test was not found.' }
  if (test.submitted_at) return { ok: false, error: 'This test has already been submitted.' }

  const limit = await checkAttemptRateLimit(supabase)
  if (!limit.allowed) return { ok: false, error: limit.message }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, problem, difficulty, given, find_prompt, official_solution, hints')
    .in('id', test.task_ids)
  if (!tasks?.length) return { ok: false, error: 'The questions for this test are unavailable.' }

  const attempted = tasks.filter((task) => (answers[task.id] ?? '').trim().length >= MIN_ANSWER_LENGTH)
  if (attempted.length === 0) {
    return { ok: false, error: 'Answer at least one question before submitting.' }
  }

  let graded
  try {
    graded = await Promise.all(
      attempted.map(async (task) => {
        const answer = (answers[task.id] ?? '').trim().slice(0, MAX_ANSWER_LENGTH)
        const grade = await gradeAttempt(
          {
            title: task.title,
            problem: task.problem,
            given: task.given ?? [],
            findPrompt: task.find_prompt,
            officialSolution: task.official_solution,
            difficulty: task.difficulty,
            hints: task.hints ?? [],
          },
          answer,
        )
        return { task, answer, grade }
      }),
    )
  } catch (cause) {
    // Nothing is written: a paper that was never graded must not be recorded
    // as graded, and a half-graded one would produce a meaningless level.
    return {
      ok: false,
      error:
        cause instanceof SuluError
          ? cause.message
          : 'The grader is unavailable right now. Your answers are still here — try submitting again.',
    }
  }

  const admin = createAdminClient()
  const { error: insertError } = await admin.from('task_attempts').insert(
    graded.map(({ task, answer, grade }) => ({
      task_id: task.id,
      user_id: user.id,
      answer,
      is_correct: grade.verdict === 'correct',
      score: grade.score,
      feedback: grade.feedback,
      graded_by: grade.redacted ? 'model:redacted' : 'model',
      model: grade.model,
      mock_test_id: test.id,
      source: 'mock',
    })),
  )
  if (insertError) return { ok: false, error: 'Your answers could not be saved. Please try again.' }

  // Unanswered questions score zero: leaving a problem blank is part of the
  // result, not an absence of one.
  const outcome = scoreMock(
    tasks.map((task) => {
      const entry = graded.find((item) => item.task.id === task.id)
      return {
        difficulty: task.difficulty,
        score: entry?.grade.score ?? 0,
        isCorrect: entry?.grade.verdict === 'correct',
      }
    }),
  )

  await admin
    .from('mock_tests')
    .update({
      submitted_at: new Date().toISOString(),
      score_percent: outcome.scorePercent,
      level: outcome.level,
    })
    .eq('id', test.id)

  // The measured level replaces the one the student guessed at during setup.
  await admin.from('profiles').update({ level: outcome.level }).eq('id', user.id)

  revalidatePath('/mock')
  revalidatePath(`/mock/${test.id}`)
  revalidatePath('/dashboard')
  revalidatePath('/me')
  revalidatePath('/path')
  revalidatePath('/me')
  return { ok: true }
}

export { GRACE_MINUTES }
