'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { checkAttemptRateLimit } from '@/lib/rate-limit'
import { gradeAttempt, type Grade } from '@/lib/sulu/grade'
import { transcribeSolutionPhoto } from '@/lib/sulu/transcribe'
import { attemptXp } from '@/lib/xp'
import type { Protocol } from '@/lib/protocol'
import { SuluError } from '@/lib/sulu/provider'
import { getLocale, getT } from '@/lib/i18n/server'

const MIN_ANSWER_LENGTH = 20
const MAX_ANSWER_LENGTH = 8_000

export type AttemptResult =
  | {
      ok: true
      /** The saved attempt, so its protocol has an address of its own. */
      attemptId: string
      protocol: Protocol
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
  const t = await getT()
  const trimmedAnswer = answer.trim()
  if (trimmedAnswer.length < MIN_ANSWER_LENGTH) {
    return { ok: false, error: t('Add a little more reasoning before submitting.') }
  }
  if (trimmedAnswer.length > MAX_ANSWER_LENGTH) {
    return {
      ok: false,
      error: t('Please keep your solution under {n} characters.', { n: MAX_ANSWER_LENGTH.toLocaleString('en') }),
    }
  }

  const supabase = await createClient()
  // Deliberately the authoritative check, not the local claim read used for
  // page rendering: the id below is handed to a client that bypasses RLS.
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }

  const limit = await checkAttemptRateLimit(supabase)
  if (!limit.allowed) return { ok: false, error: t(limit.message, limit.vars) }


  // Read with the service role, because `authenticated` no longer holds the
  // column: official_solution was revoked from the browser's role in migration
  // 0022, which is what stops a student fetching the answer key over the REST
  // API. Nothing is widened by reading it here — every task row is visible to
  // every signed-in student anyway, and the id came from the request while the
  // user came from the verified session above.
  const admin = createAdminClient()
  const { data: task, error: taskError } = await admin
    .from('tasks')
    .select('id, title, problem, difficulty, given, find_prompt, official_solution, hints, diagram_url, class_id, hidden')
    .eq('id', taskId)
    .maybeSingle()
  if (taskError || !task) {
    return { ok: false, error: t('This task is unavailable. Please return to the task library.') }
  }
  // A class's own problem is read above with the service role, which sees
  // every class. Whether this student may submit to it is the row policy's
  // call, so the row is read once more as them.
  // A hidden one is refused the same way: the policy no longer shows it.
  if (task.class_id || task.hidden) {
    const { data: visible } = await supabase.from('tasks').select('id').eq('id', taskId).maybeSingle()
    if (!visible) return { ok: false, error: t('This task is unavailable. Please return to the task library.') }
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
        diagramUrl: task.diagram_url,
        language: await getLocale(),
      },
      trimmedAnswer,
    )
  } catch (cause) {
    // Nothing is written: an ungraded attempt must not be recorded as graded.
    return {
      ok: false,
      error:
        cause instanceof SuluError
          ? t(cause.message)
          : t('The grader is unavailable right now. Your work has not been lost — try submitting again in a moment.'),
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
  const { data: inserted, error: insertError } = await admin.from('task_attempts').insert({
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
    points: grade.points,
    summary: grade.summary,
    marks: grade.marks,
    criteria: grade.criteria,
    break_point: grade.breakPoint,
  }).select('id').single()
  if (insertError || !inserted) {
    return { ok: false, error: t('Your attempt could not be saved. Please try again.') }
  }

  revalidatePath('/tasks')
  revalidatePath(`/tasks/${task.id}`)
  revalidatePath('/me')
  revalidatePath('/dashboard')
  revalidatePath('/plan')
  revalidatePath('/path')

  return {
    ok: true,
    attemptId: inserted.id,
    protocol: {
      verdict: grade.verdict,
      points: grade.points,
      pointsDerived: false,
      score: grade.score,
      summary: grade.summary,
      feedback: grade.feedback,
      nextHint: grade.nextHint,
      marks: grade.marks,
      criteria: grade.criteria,
      breakPoint: grade.breakPoint,
      answer: trimmedAnswer,
    },
    xpEarned,
    repeat: alreadySolved,
    firstSolve: grade.verdict === 'correct' && !alreadySolved,
  }
}

/** A photo is downscaled in the browser first; anything near this is not one. */
const MAX_PHOTO_CHARS = 3_000_000
const PHOTO_PREFIX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

export type PhotoResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'session' | 'invalid' | 'unreadable' | 'failed' }

/**
 * Reads a photographed notebook page into the lines of a solution.
 *
 * Nothing is stored and nothing is graded here: the text goes back to the
 * editor, the student checks it against the page, and grading is the same
 * submitTaskAttempt as a typed solution. A misread line is then the student's
 * to fix before the jury sees it, not a mark against them.
 */
export async function readSolutionPhoto(taskId: string, image: string): Promise<PhotoResult> {
  const user = await getVerifiedUser()
  if (!user) return { ok: false, reason: 'session' }
  if (typeof image !== 'string' || image.length > MAX_PHOTO_CHARS || !PHOTO_PREFIX.test(image)) {
    return { ok: false, reason: 'invalid' }
  }

  const supabase = await createClient()
  const { data: task } = await supabase.from('tasks').select('problem').eq('id', taskId).maybeSingle()
  if (!task) return { ok: false, reason: 'invalid' }

  try {
    const result = await transcribeSolutionPhoto(image, task.problem, await getLocale())
    return result.readable ? { ok: true, text: result.text } : { ok: false, reason: 'unreadable' }
  } catch (error) {
    console.error('readSolutionPhoto', error instanceof SuluError ? error.message : error)
    return { ok: false, reason: 'failed' }
  }
}

export type ReportResult = { ok: true; message: string } | { ok: false; error: string }

const MAX_REPORT_LENGTH = 2_000
const REPORTS_PER_DAY = 20

/**
 * "I think the check is wrong" and "there is a mistake in this statement".
 *
 * Before this there was no way to contest a verdict: re-asking Sulu did not
 * change the score, and a confident wrong verdict stood. The report carries the
 * task and, for grading, the attempt, so nobody has to retype the problem; an
 * admin works through them at /admin/reports and the outcome shows on the task.
 */
export async function reportTaskIssue(input: {
  taskId: string
  attemptId?: string | null
  kind: 'grading' | 'statement'
  message: string
}): Promise<ReportResult> {
  const t = await getT()
  const message = input.message.trim()
  if (!message) return { ok: false, error: t('Say in a sentence what looks wrong.') }
  if (message.length > MAX_REPORT_LENGTH) {
    return { ok: false, error: t('Please keep it under {n} characters.', { n: MAX_REPORT_LENGTH }) }
  }
  if (input.kind !== 'grading' && input.kind !== 'statement') {
    return { ok: false, error: t('Malformed request body.') }
  }

  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }

  const admin = createAdminClient()
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await admin
    .from('task_reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since)
  if ((count ?? 0) >= REPORTS_PER_DAY) {
    return { ok: false, error: t('That is a lot of reports for one day. Try again tomorrow.') }
  }

  // The attempt must be the reporter's own and belong to this task; anything
  // else is dropped rather than trusted.
  let attemptId: string | null = null
  if (input.kind === 'grading' && input.attemptId) {
    const { data: attempt } = await admin
      .from('task_attempts')
      .select('id')
      .eq('id', input.attemptId)
      .eq('user_id', user.id)
      .eq('task_id', input.taskId)
      .maybeSingle()
    attemptId = attempt?.id ?? null
  }

  const { error } = await admin.from('task_reports').insert({
    user_id: user.id,
    task_id: input.taskId,
    attempt_id: attemptId,
    kind: input.kind,
    message,
  })
  if (error) return { ok: false, error: t('That did not save. Please try again.') }

  revalidatePath(`/tasks/${input.taskId}`)
  revalidatePath('/admin/reports')
  return { ok: true, message: t('Sent. The result of the review will appear on this task.') }
}

/** Saves a problem to come back to, or takes it off the list. */
export async function toggleSavedTask(taskId: string, save: boolean): Promise<{ ok: boolean; saved: boolean; error?: string }> {
  const t = await getT()
  const user = await getVerifiedUser()
  if (!user) return { ok: false, saved: !save, error: t('Your session has expired. Please log in again.') }
  const supabase = await createClient()
  // Only a problem this student may see can be saved.
  const { data: visible } = await supabase.from('tasks').select('id').eq('id', taskId).maybeSingle()
  if (!visible) return { ok: false, saved: !save, error: t('This task is unavailable. Please return to the task library.') }
  const { error } = save
    ? await supabase.from('saved_tasks').upsert({ user_id: user.id, task_id: taskId }, { onConflict: 'user_id,task_id' })
    : await supabase.from('saved_tasks').delete().eq('user_id', user.id).eq('task_id', taskId)
  if (error) return { ok: false, saved: !save, error: t('That did not save. Please try again.') }
  revalidatePath('/tasks')
  revalidatePath(`/tasks/${taskId}`)
  return { ok: true, saved: save }
}

/**
 * Keeps the editor's text with the account, so a solution started on one
 * device is there on the next. An empty text removes the copy.
 */
export async function saveServerDraft(taskId: string, text: string): Promise<{ ok: boolean; savedAt?: string }> {
  const user = await getVerifiedUser()
  if (!user) return { ok: false }
  const supabase = await createClient()
  const body = text.slice(0, 20_000)
  if (!body.trim()) {
    const { error } = await supabase.from('task_drafts').delete().eq('user_id', user.id).eq('task_id', taskId)
    return { ok: !error }
  }
  const savedAt = new Date().toISOString()
  const { error } = await supabase
    .from('task_drafts')
    .upsert({ user_id: user.id, task_id: taskId, body, updated_at: savedAt }, { onConflict: 'user_id,task_id' })
  return error ? { ok: false } : { ok: true, savedAt }
}
