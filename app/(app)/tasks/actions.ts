'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseSecretKey } from '@/lib/supabase/secret-env'
import { checkAttemptRateLimit } from '@/lib/rate-limit'
import { gradeAttempt, type Grade } from '@/lib/sulu/grade'
import { attemptXp } from '@/lib/xp'
import type { Verdict } from '@/lib/sulu/types'
import { SuluError } from '@/lib/sulu/provider'

const MIN_ANSWER_LENGTH = 20
const MAX_ANSWER_LENGTH = 8_000

export type AttemptResult =
  | {
      ok: true
      verdict: Verdict
      score: number
      feedback: string
      nextHint: string | null
      /** XP this attempt earned, so the reward lands with the verdict. */
      xpEarned: number
      /** True when the task was already solved, which caps the reward. */
      repeat: boolean
      firstSolve: boolean
    }
  | { ok: false; error: string }

export async function submitTaskAttempt(
  taskId: string,
  answer: string,
): Promise<AttemptResult> {
  const trimmedAnswer = answer.trim()
  if (trimmedAnswer.length < MIN_ANSWER_LENGTH) {
    return { ok: false, error: 'Add a little more reasoning before submitting.' }
  }
  if (trimmedAnswer.length > MAX_ANSWER_LENGTH) {
    return {
      ok: false,
      error: `Please keep your solution under ${MAX_ANSWER_LENGTH.toLocaleString('en')} characters.`,
    }
  }

  const supabase = await createClient()
  // Deliberately the authoritative check, not the local claim read used for
  // page rendering: the id below is handed to a client that bypasses RLS.
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }

  const limit = await checkAttemptRateLimit(supabase)
  if (!limit.allowed) return { ok: false, error: limit.message }

  // Read through the caller's session so RLS still decides what is visible.
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, title, problem, difficulty, given, find_prompt, official_solution, hints')
    .eq('id', taskId)
    .maybeSingle()
  if (taskError || !task) {
    return { ok: false, error: 'This task is unavailable. Please return to the task library.' }
  }

  if (!hasSupabaseSecretKey()) {
    // Without the service role we cannot write a grade the browser could not
    // have written itself, and a score nobody can trust is worse than none.
    return {
      ok: false,
      error: 'Grading is not configured on this server. Add SUPABASE_SECRET_KEY and try again.',
    }
  }

  let grade: Grade
  try {
    grade = await gradeAttempt(
      {
        title: task.title,
        problem: task.problem,
        given: task.given ?? [],
        findPrompt: task.find_prompt,
        officialSolution: task.official_solution,
        difficulty: task.difficulty,
        hints: task.hints ?? [],
      },
      trimmedAnswer,
    )
  } catch (cause) {
    // Nothing is written: an ungraded attempt must not be recorded as graded.
    return {
      ok: false,
      error:
        cause instanceof SuluError
          ? cause.message
          : 'The grader is unavailable right now. Your work has not been lost — try submitting again in a moment.',
    }
  }

  // Whether this task was already solved decides the reward: re-submitting a
  // solved problem is worth a tenth, so levels track understanding rather than
  // persistence at the submit button.
  const { data: priorSolve } = await supabase
    .from('task_attempts')
    .select('id')
    .eq('user_id', user.id)
    .eq('task_id', task.id)
    .eq('is_correct', true)
    .limit(1)
    .maybeSingle()
  const alreadySolved = Boolean(priorSolve)

  const xpEarned = attemptXp(
    {
      taskId: task.id,
      difficulty: task.difficulty,
      isCorrect: grade.verdict === 'correct',
      score: grade.score,
      createdAt: new Date().toISOString(),
    },
    alreadySolved,
  )

  // The grade is written with the service role, because `authenticated` has no
  // insert on task_attempts: a row the browser can write is a row the browser
  // can score. user_id comes from the verified session above, never from input.
  const admin = createAdminClient()
  const { error: insertError } = await admin.from('task_attempts').insert({
    task_id: task.id,
    user_id: user.id,
    answer: trimmedAnswer,
    is_correct: grade.verdict === 'correct',
    score: grade.score,
    feedback: grade.feedback,
    // Marks attempts where the answer-secrecy guard had to cut something, so a
    // drifting prompt shows up in a query instead of going unnoticed.
    graded_by: grade.redacted ? 'model:redacted' : 'model',
    model: grade.model,
  })
  if (insertError) {
    return { ok: false, error: 'Your attempt could not be saved. Please try again.' }
  }

  revalidatePath('/tasks')
  revalidatePath(`/tasks/${task.id}`)
  revalidatePath('/me')
  revalidatePath('/dashboard')
  revalidatePath('/path')

  return {
    ok: true,
    verdict: grade.verdict,
    score: grade.score,
    feedback: grade.feedback,
    nextHint: grade.nextHint,
    xpEarned,
    repeat: alreadySolved,
    firstSolve: grade.verdict === 'correct' && !alreadySolved,
  }
}
