import 'server-only'

import { cache } from 'react'
import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/supabase/auth'
import { getCurrentProfile, getGoal, getPreparationSettings } from '@/lib/supabase/queries'

export type TrainingStage = 'School' | 'Regional' | 'National' | 'International'
export type GoalSnapshot = {
  subjectId: string
  subjectName: string
  competitionId: string
  competitionName: string
  stage: TrainingStage
  targetDate: string
  weekdays: number[]
  sessionMinutes: number
  schoolGrade: number
  dailyTasks: number
  reviewPercent: number
  telegramReflectionEnabled: boolean
}
export type PreparationGoalHistory = {
  id: string
  desiredResult: string
  why: string
  snapshot: GoalSnapshot
  createdAt: string
}

export const getPreparationPersonalGoal = cache(async (before?: string): Promise<{
  desiredResult: string
  why: string
  history: PreparationGoalHistory[]
  nextHistoryCursor: string | null
}> => {
  const userId = await getSessionUserId()
  if (!userId) return { desiredResult: '', why: '', history: [], nextHistoryCursor: null }
  const db = await getDb()
  const cursor = typeof before === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(before) ? before : null
  const [current, history] = await Promise.all([
    db.query<{ desired_result: string; personal_why: string }>(
      'select desired_result,personal_why from public.preparation_preferences where user_id=$1', [userId],
    ),
    db.query<{ id: string; desired_result: string; personal_why: string; goal_snapshot: GoalSnapshot; created_at: string }>(
      `select id,desired_result,personal_why,goal_snapshot,created_at from public.preparation_goal_history where user_id=$1
       ${cursor ? 'and (created_at,id)<(select created_at,id from public.preparation_goal_history where user_id=$1 and id=$2::uuid)' : ''} order by created_at desc,id desc limit 51`, cursor ? [userId, cursor] : [userId],
    ),
  ])
  return {
    desiredResult: current.rows[0]?.desired_result ?? '',
    why: current.rows[0]?.personal_why ?? '',
    nextHistoryCursor: history.rows.length > 50 ? history.rows[49].id : null,
    history: history.rows.slice(0, 50).map((row) => ({ id: row.id, desiredResult: row.desired_result, why: row.personal_why, snapshot: row.goal_snapshot, createdAt: row.created_at })),
  }
})

export const getTrainingSettings = cache(async () => {
  const [goal, settings, personal, profile] = await Promise.all([
    getGoal(), getPreparationSettings(), getPreparationPersonalGoal(), getCurrentProfile(),
  ])
  return {
    goal,
    ...settings,
    ...personal,
    telegramLinked: Boolean(profile?.telegram_chat_id && profile.telegram_linked_at),
    profileGrade: profile?.grade ?? null,
  }
})
