'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { checkAttemptRateLimit } from '@/lib/rate-limit'
import { gradeAttempt } from '@/lib/sulu/grade'
import { SuluError } from '@/lib/sulu/provider'
import { attemptXp } from '@/lib/xp'
import { composeMockFor, realPapers, scoreMock } from '@/lib/mock'
import { getCurrentProfile, getTaskCatalogue } from '@/lib/supabase/queries'
import { getLocale, getT } from '@/lib/i18n/server'

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
  const t = await getT()
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }

  const supabase = await createClient()
  const { data: subject } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('name', subjectName)
    .maybeSingle()
  if (!subject) return { ok: false, error: t('That subject is no longer available.') }

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

  const [catalogue, profile] = await Promise.all([getTaskCatalogue(), getCurrentProfile()])
  const blueprint = composeMockFor(catalogue, subject.name, profile?.grade)
  if (!blueprint) {
    return { ok: false, error: t('This subject needs at least three tasks before a mock test.') }
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
  if (error || !created) return { ok: false, error: t('The test could not be started.') }

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
  const t = await getT()
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }

  const supabase = await createClient()
  const { data: test } = await supabase
    .from('mock_tests')
    .select('id, user_id, subject_id, task_ids, submitted_at, started_at, duration_minutes, preparation_key')
    .eq('id', testId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!test) return { ok: false, error: t('That test was not found.') }
  if (test.submitted_at) return { ok: false, error: t('This test has already been submitted.') }

  const limit = await checkAttemptRateLimit(supabase)
  if (!limit.allowed) return { ok: false, error: t(limit.message, limit.vars) }

  // Service role: official_solution is not readable by `authenticated` — see
  // migration 0022. The paper itself was already checked against this user.
  const admin = createAdminClient()
  const { data: tasks } = await admin
    .from('tasks')
    .select('id, title, problem, difficulty, given, find_prompt, official_solution, hints, diagram_url')
    .in('id', test.task_ids)
  if (!tasks?.length) return { ok: false, error: t('The questions for this test are unavailable.') }

  const attempted = tasks.filter((task) => (answers[task.id] ?? '').trim().length >= MIN_ANSWER_LENGTH)
  if (attempted.length === 0) {
    return { ok: false, error: t('Answer at least one question before submitting.') }
  }

  let graded
  const language = await getLocale()
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
            diagramUrl: task.diagram_url,
            language,
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
          ? t(cause.message)
          : t('The grader is unavailable right now. Your answers are still here — try submitting again.'),
    }
  }

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

  // Work handed in after the clock is graded as practice, not as a timed result.
  const deadline = new Date(test.started_at).getTime() + (test.duration_minutes + GRACE_MINUTES) * 60_000
  const late = Date.now() > deadline
  // A paper only speaks for the subject it was sat in: a mathematics paper
  // must not move the level of a student whose profile is about physics.
  const [{ data: subjectRow }, profile] = await Promise.all([
    supabase.from('subjects').select('name').eq('id', test.subject_id).maybeSingle(),
    getCurrentProfile(),
  ])
  const sameSubject = !profile?.primary_subject || profile.primary_subject === subjectRow?.name
  const applyLevel = !late && !test.preparation_key && sameSubject

  // Finish the test and record its attempts together. A concurrent retry
  // cannot grade the same paper into the student's history a second time.
  try {
    const db = await getDb()
    const saved = await db.transaction(async (tx) => {
      const { rows } = await tx.query(
        `update public.mock_tests set submitted_at = now(), score_percent = $3, level = $4,
           submitted_late = $5, level_applied = $6
         where id = $1 and user_id = $2 and submitted_at is null returning id`,
        [test.id, user.id, outcome.scorePercent, test.preparation_key || late ? null : outcome.level, late, applyLevel],
      )
      if (!rows.length) return false

      const attempts = graded.map(({ task, answer, grade }) => ({
        task_id: task.id,
        answer,
        is_correct: grade.verdict === 'correct',
        score: grade.score,
        feedback: grade.feedback,
        graded_by: grade.redacted ? 'model:redacted' : 'model',
        model: grade.model,
        points: grade.points,
        summary: grade.summary,
        marks: grade.marks,
        criteria: grade.criteria,
        break_point: grade.breakPoint,
      }))
      await tx.query(
        `insert into public.task_attempts (
          task_id, user_id, answer, is_correct, score, feedback, graded_by, model,
          points, summary, marks, criteria, break_point, mock_test_id, source
        )
        select task_id, $2, answer, is_correct, score, feedback, graded_by, model,
          points, summary, marks, criteria, break_point, $3, 'mock'
        from jsonb_populate_recordset(null::public.task_attempts, $1::jsonb)`,
        [JSON.stringify(attempts), user.id, test.id],
      )
      if (applyLevel) {
        await tx.query('update public.profiles set level = $2 where id = $1', [user.id, outcome.level])
      }
      return true
    })
    if (!saved) return { ok: false, error: t('This test has already been submitted.') }
  } catch {
    return { ok: false, error: t('Your answers could not be saved. Please try again.') }
  }

  revalidatePath('/mock')
  revalidatePath(`/mock/${test.id}`)
  revalidatePath('/dashboard')
  revalidatePath('/plan')
  revalidatePath('/me')
  revalidatePath('/path')
  return { ok: true }
}

/**
 * Sits a real past paper: same table, same grading, same XP as a composed
 * one; only where the question set came from differs. The task ids are read
 * back from the catalogue rather than taken from the caller — the argument
 * names a paper, and what that paper contains is not the browser's to decide.
 */
export async function startPaper(paper: string, minutes?: number): Promise<MockResult> {
  const t = await getT()
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }

  const supabase = await createClient()
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
  const found = realPapers(catalogue).find((entry) => entry.paper === paper)
  if (!found) return { ok: false, error: t('That paper is no longer available.') }

  const subjectName = catalogue.find((task) => task.id === found.taskIds[0])?.subject
  const { data: subject } = await supabase.from('subjects').select('id').eq('name', subjectName ?? '').maybeSingle()
  if (!subject) return { ok: false, error: t('That subject is no longer available.') }

  const { data: created, error } = await createAdminClient()
    .from('mock_tests')
    .insert({
      user_id: user.id,
      subject_id: subject.id,
      task_ids: found.taskIds,
      // The student sets the clock to the round they are preparing for; the
      // estimate from the problems is only the default.
      duration_minutes:
        Number.isInteger(minutes) && minutes! >= 15 && minutes! <= 360 ? minutes! : found.durationMinutes,
    })
    .select('id')
    .single()
  if (error || !created) return { ok: false, error: t('The paper could not be started.') }

  revalidatePath('/mock')
  redirect(`/mock/${created.id}`)
}
