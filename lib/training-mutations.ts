import type { Transaction } from '@electric-sql/pglite'

type TimedActivity = {
  userId: string
  sessionId: string
  goalKey: string
  today: string
} & ({ kind: 'quiz'; questionId: string } | { kind: 'mock'; mockKey: string } | { kind: 'task'; taskId: string })

/** Reserve the actual assigned activity in the same transaction as its first write. */
export async function reserveTrainingActivity(tx: Transaction, input: TimedActivity) {
  const condition = input.kind === 'quiz' ? 'quiz_minutes>0 and $5=any(question_ids)' : input.kind === 'task' ? "session_kind='study' and $5=any(task_ids)" : "session_kind='mock' and mock_key=$5"
  const activityId = input.kind === 'quiz' ? input.questionId : input.kind === 'task' ? input.taskId : input.mockKey
  const result = await tx.query(`update public.preparation_sessions set started_at=coalesce(started_at,now())
    where id=$1 and user_id=$2 and goal_key=$3 and on_date=$4
    and completed_at is null and skipped_at is null and superseded_at is null
    and ${condition}
    returning id`, [input.sessionId, input.userId, input.goalKey, input.today, activityId])
  return result.rows.length > 0
}

/** A part can mark the whole lesson read only after its full reading allocation. */
export async function syncTimedLessonCompletion(tx: Transaction, input: { userId: string; goalKey: string; lessonId: string; complete: boolean }) {
  const totals = await tx.query<{ done: number; required: number }>(`select
    coalesce((select sum(lesson_minutes) from public.preparation_sessions where user_id=$1 and goal_key=$2 and lesson_id=$3
      and (lesson_completed_at is not null or completed_at is not null)),0)::int as done,
    coalesce((select estimated_minutes from public.lessons where id=$3),15)::int as required`, [input.userId, input.goalKey, input.lessonId])
  const full = totals.rows[0].done >= totals.rows[0].required
  if (input.complete && full) {
    await tx.query(`insert into public.lesson_views(user_id,lesson_id,completed_at) values($1,$2,now())
      on conflict(user_id,lesson_id) do update set completed_at=coalesce(lesson_views.completed_at,excluded.completed_at)`, [input.userId, input.lessonId])
  } else if (!input.complete && !full) {
    // The completion trigger retains first_completed_at, so undoing a read
    // flag does not erase history or award the first-completion XP twice.
    await tx.query('update public.lesson_views set completed_at=null where user_id=$1 and lesson_id=$2', [input.userId, input.lessonId])
  }
}
