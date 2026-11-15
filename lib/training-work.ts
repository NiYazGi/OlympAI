import type { DailyDraft } from '@/lib/daily-preparation'
export type WorkRecord = DailyDraft & { completed_at: string | null; lesson_completed_at: string | null; quiz_completed_at: string | null }
/** A timed route action is separate from a correct solution or a mastered skill. */
export function addSessionWork(work: Record<string,number>, session: WorkRecord, planned = false, topicSlug?: string) {
  const add = (key: string, minutes: number) => { if (minutes > 0) work[key] = (work[key] ?? 0) + minutes }
  if ((planned || session.completed_at || session.lesson_completed_at) && session.lesson_id) add(`lesson:${session.lesson_id}`, session.lesson_minutes)
  if (planned || session.completed_at) session.task_ids.forEach((id,index) => add(`task:${id}`, session.task_minutes[index] ?? 0))
  if ((planned || session.completed_at || session.quiz_completed_at) && topicSlug) add(`quiz:${topicSlug}`, session.quiz_minutes)
  if ((planned || session.completed_at) && session.review_mock_key) add(`review:${session.review_mock_key}`, session.review_minutes)
  return work
}
