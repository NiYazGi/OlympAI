import 'server-only'

import { createHash } from 'node:crypto'
import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/supabase/auth'
import { planDailySessions, type DailyDraft, type DailyTopic } from '@/lib/daily-preparation'
import { isCompetitionTask } from '@/lib/competition-analysis'
import type { PreparationInput, PreparationPlan, PreparationStep } from '@/lib/preparation'

export type DailySession = DailyDraft & {
  id: string
  user_id: string
  scope: string
  created_at: string
  lesson_completed_at: string | null
  quiz_completed_at: string | null
}

export async function getDailySession(id: string | undefined) {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null
  const userId = await getSessionUserId()
  if (!userId) return null
  const db = await getDb()
  const { rows } = await db.query<DailySession>('select * from public.preparation_sessions where id=$1 and user_id=$2', [id, userId])
  return rows[0] ?? null
}

export async function getDailyPreparation(input: PreparationInput, topics: DailyTopic[], mockPrefix: string): Promise<PreparationPlan> {
  const userId = await getSessionUserId()
  if (!userId) throw new Error('A daily program requires a session')
  const scope = createHash('sha256').update(JSON.stringify([mockPrefix, input.targetDate, input.preferences, 'daily-v1'])).digest('hex')
  const db = await getDb()
  let { rows: sessions } = await db.query<DailySession>(
    'select * from public.preparation_sessions where user_id=$1 and scope=$2 order by on_date', [userId, scope],
  )
  if (!sessions.length) {
    const drafts = planDailySessions(input, topics)
    if (drafts.length) {
      await db.query([
        'insert into public.preparation_sessions(user_id,scope,on_date,topic_id,lesson_id,task_ids,question_ids,minutes,mock_key,full_paper)',
        'select $1,$2,d.on_date,d.topic_id,d.lesson_id,d.task_ids,d.question_ids,d.minutes,d.mock_key,d.full_paper',
        'from jsonb_to_recordset($3::jsonb) as d(on_date date,topic_id uuid,lesson_id text,task_ids text[],question_ids text[],minutes int,mock_key text,full_paper boolean)',
        'on conflict(user_id,scope,on_date) do nothing',
      ].join(' '), [userId, scope, JSON.stringify(drafts)])
      sessions = (await db.query<DailySession>(
        'select * from public.preparation_sessions where user_id=$1 and scope=$2 order by on_date', [userId, scope],
      )).rows
    }
  }

  const tasks = new Map(input.tasks.map((task) => [task.id, task]))
  const byTopic = new Map(topics.map((topic) => [topic.id, topic]))
  const steps: PreparationStep[] = []
  for (const session of sessions) {
    if (session.mock_key) {
      const existing = input.mocks.find((mock) => mock.key === session.mock_key)
      steps.push({ id: session.mock_key, kind: 'mock', title: 'Timed practice', date: session.on_date, minutes: session.minutes,
        href: existing ? '/mock/' + existing.id : undefined, completedAt: existing?.completedAt ?? undefined,
        source: session.task_ids.every((id) => isCompetitionTask({ id }, input.competitionSlug)) ? 'archive' : 'similar',
        mock: existing ? undefined : { taskIds: session.task_ids, fullPaper: session.full_paper } })
      continue
    }
    const topic = byTopic.get(session.topic_id ?? '')
    if (!topic?.lesson) continue
    const params = 'session=' + session.id
    steps.push({ id: session.id + '-lesson', kind: 'lesson', title: topic.lesson.title, topic: topic.name,
      date: session.on_date, minutes: topic.lesson.minutes, completedAt: session.lesson_completed_at ?? undefined,
      href: '/learn/' + topic.slug + '/lesson?' + params })
    for (const id of session.task_ids) {
      const task = tasks.get(id)
      if (!task) continue
      steps.push({ id: session.id + '-' + id, kind: 'task', title: task.title, topic: topic.name, date: session.on_date,
        minutes: task.estimatedMinutes ?? 25, href: '/tasks/' + encodeURIComponent(id),
        completedAt: input.completedTasks.get(id), source: isCompetitionTask(task, input.competitionSlug) ? 'archive' : 'similar' })
    }
    steps.push({ id: session.id + '-quiz', kind: 'quiz', title: topic.name, topic: topic.name,
      date: session.on_date, minutes: topic.quiz?.minutes ?? 6, completedAt: session.quiz_completed_at ?? undefined,
      href: '/learn/' + topic.slug + '/quiz?' + params })
  }
  for (const mock of input.mocks) {
    if (!sessions.some((session) => session.mock_key === mock.key)) {
      steps.push({ id: mock.key, kind: 'mock', title: 'Mock test', minutes: mock.minutes,
        date: mock.startedAt.slice(0, 10), href: '/mock/' + mock.id, completedAt: mock.completedAt ?? undefined })
    }
    if (!mock.completedAt || mock.missedTaskIds.length === 0) continue
    steps.push({ id: 'review-' + mock.id, kind: 'review', title: 'Review mistakes', minutes: 10,
      date: mock.completedAt.slice(0, 10), href: '/mock/' + mock.id, completedAt: mock.reviewedAt ?? undefined })
  }

  const daysLeft = Math.max(0, Math.round((Date.parse(input.targetDate) - Date.parse(input.today)) / 86_400_000))
  const studySessions = sessions.filter((session) => !session.mock_key)
  const eligibleDays = Array.from({ length: Math.min(daysLeft, 730) }, (_, offset) => new Date(Date.parse(input.today) + offset * 86_400_000))
    .filter((date) => input.preferences.weekdays.includes(date.getUTCDay()) && (Date.parse(input.targetDate) - date.getTime()) / 86_400_000 > 2).length
  return {
    steps: steps.sort((a, b) => a.date.localeCompare(b.date)), daysLeft, preferredMinutes: sessions.length * input.preferences.sessionMinutes,
    scheduledMinutes: sessions.reduce((sum, session) => sum + session.minutes, 0),
    hasArchive: input.tasks.some((task) => isCompetitionTask(task, input.competitionSlug)),
    hasMaterials: sessions.length > 0, adaptedToday: false, priorityOnly: false,
    daily: { tasks: input.preferences.dailyTasks ?? 5, sessions: studySessions.length,
      contentShortage: sessions.filter((session) => session.on_date >= input.today).length < eligibleDays,
      overloadedDays: studySessions.filter((session) => session.minutes > input.preferences.sessionMinutes).length },
  }
}
