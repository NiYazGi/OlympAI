'use server'

import { revalidatePath } from 'next/cache'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { runAs } from '@/lib/db/query'
import { defaultPreparationPreferences } from '@/lib/preparation'
import type { GoalSnapshot, TrainingStage } from '@/lib/supabase/preparation-settings'

export type TrainingSettingsResult = { ok: boolean; error?: string }
const STAGES = new Set(['School', 'Regional', 'National', 'International'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
class SettingsError extends Error {}

export async function saveTrainingSettings(_previous: TrainingSettingsResult | null, form: FormData): Promise<TrainingSettingsResult> {
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: 'Сессия завершилась. Войди снова.' }
  const competitionId = String(form.get('competition_id') ?? '').trim()
  const subjectId = String(form.get('subject_id') ?? '').trim()
  const stage = String(form.get('competition_stage') ?? '').trim()
  const targetDate = String(form.get('target_date') ?? '').trim()
  const schoolGrade = Number(form.get('school_grade'))
  const sessionMinutes = Number(form.get('session_minutes'))
  const dailyTasks = Number(form.get('daily_tasks'))
  const reviewPercent = Number(form.get('review_percent') ?? 20)
  const rawDays = form.getAll('weekday').map((value) => String(value))
  const weekdays = [...new Set(rawDays.map(Number))].sort((a, b) => a - b)
  const desiredResult = String(form.get('desired_result') ?? '').trim()
  const why = String(form.get('personal_why') ?? '').trim()
  const telegramReflectionEnabled = form.get('telegram_reflection_enabled') === 'on'

  if (!UUID.test(competitionId) || !UUID.test(subjectId) || !STAGES.has(stage)) return { ok: false, error: 'Выбери предмет, олимпиаду и этап.' }
  if (!rawDays.length || rawDays.some((day) => !/^[0-6]$/.test(day)) || weekdays.length > 7) return { ok: false, error: 'Выбери хотя бы один день занятий.' }
  if (!Number.isInteger(schoolGrade) || schoolGrade < 6 || schoolGrade > 12 ||
    !Number.isInteger(sessionMinutes) || sessionMinutes < 15 || sessionMinutes > 360 ||
    !Number.isInteger(dailyTasks) || dailyTasks < 1 || dailyTasks > 10 ||
    !Number.isInteger(reviewPercent) || reviewPercent < 10 || reviewPercent > 50) {
    return { ok: false, error: 'Укажи класс 6–12, занятие 15–360 минут, не более 10 задач и 10–50% времени на разбор.' }
  }
  if (desiredResult.length > 1000 || why.length > 2000) return { ok: false, error: 'Результат — до 1000 символов, личная запись — до 2000.' }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const target = /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? new Date(`${targetDate}T00:00:00Z`) : null
  const days = target ? (target.getTime() - Date.parse(`${today}T00:00:00Z`)) / 86_400_000 : NaN
  if (!target || !Number.isFinite(days) || target.toISOString().slice(0, 10) !== targetDate || days < 1 || days > 730) {
    return { ok: false, error: 'Выбери будущую дату в пределах двух лет.' }
  }

  try {
    await runAs({ role: 'service_role', userId: user.id }, async (tx) => {
      const profile = (await tx.query<{
        role: string; training_intensity: string | null; telegram_chat_id: number | null; telegram_linked_at: string | null
        target_competition_id: string | null; target_subject_id: string | null; target_date: string | null; goal_set_at: string | null
      }>('select role,training_intensity,telegram_chat_id,telegram_linked_at,target_competition_id,target_subject_id,target_date,goal_set_at from public.profiles where id=$1 for update', [user.id])).rows[0]
      if (!profile || profile.role === 'teacher') throw new SettingsError('Эта программа предназначена для личной подготовки ученика.')
      const competition = (await tx.query<{ id: string; name: string; subject_id: string | null }>('select id,name,subject_id from public.competitions where id=$1', [competitionId])).rows[0]
      const subject = (await tx.query<{ id: string; name: string }>('select id,name from public.subjects where id=$1 and active=true', [subjectId])).rows[0]
      if (!competition || !subject || (competition.subject_id && competition.subject_id !== subject.id)) throw new SettingsError('Предмет не соответствует выбранной олимпиаде.')
      if (telegramReflectionEnabled && (!profile.telegram_chat_id || !profile.telegram_linked_at)) throw new SettingsError('Сначала привяжи Telegram в настройках аккаунта.')
      const previous = (await tx.query<{ weekdays: number[]; session_minutes: number }>('select weekdays,session_minutes from public.preparation_preferences where user_id=$1', [user.id])).rows[0]
      const defaults = defaultPreparationPreferences(profile.training_intensity)
      const oldWeeklyMinutes = previous ? previous.weekdays.length * previous.session_minutes : defaults.weekdays.length * defaults.sessionMinutes
      const weeklyMinutes = weekdays.length * sessionMinutes
      if (weeklyMinutes > oldWeeklyMinutes && form.get('confirm_increase') !== 'on') throw new SettingsError('Недельная нагрузка увеличилась. Подтверди, что согласен выделить это время, или уменьши объём.')
      const goalChanged = profile.target_competition_id !== competition.id || profile.target_subject_id !== subject.id || profile.target_date !== targetDate
      await tx.query(`update public.profiles set target_subject_id=$2,target_competition_id=$3,target_date=$4,
        goal_set_at=case when $5::boolean or goal_set_at is null then now() else goal_set_at end where id=$1`, [user.id, subject.id, competition.id, targetDate, goalChanged])
      await tx.query(`insert into public.preparation_preferences(user_id,weekdays,session_minutes,school_grade,daily_tasks,competition_stage,desired_result,personal_why,review_percent,telegram_reflection_enabled)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict(user_id) do update set weekdays=excluded.weekdays,
        session_minutes=excluded.session_minutes,school_grade=excluded.school_grade,daily_tasks=excluded.daily_tasks,
        competition_stage=excluded.competition_stage,desired_result=excluded.desired_result,personal_why=excluded.personal_why,
        review_percent=excluded.review_percent,telegram_reflection_enabled=excluded.telegram_reflection_enabled`,
      [user.id, weekdays, sessionMinutes, schoolGrade, dailyTasks, stage, desiredResult, why, reviewPercent, telegramReflectionEnabled])
      if (!telegramReflectionEnabled) {
        await tx.query('delete from public.telegram_reflection_sessions where user_id=$1',[user.id])
        await tx.query('delete from public.telegram_sessions where user_id=$1',[user.id])
      }
      const snapshot: GoalSnapshot = {
        subjectId: subject.id, subjectName: subject.name, competitionId: competition.id, competitionName: competition.name,
        stage: stage as TrainingStage, targetDate, weekdays, sessionMinutes, schoolGrade, dailyTasks, reviewPercent, telegramReflectionEnabled,
      }
      const identical = (await tx.query<{ same: boolean }>(`select (desired_result=$2 and personal_why=$3 and goal_snapshot=$4::jsonb) as same
        from public.preparation_goal_history where user_id=$1 order by created_at desc,id desc limit 1`, [user.id, desiredResult, why, JSON.stringify(snapshot)])).rows[0]?.same
      if (!identical) await tx.query(`insert into public.preparation_goal_history(user_id,desired_result,personal_why,goal_snapshot) values ($1,$2,$3,$4::jsonb)`, [user.id, desiredResult, why, JSON.stringify(snapshot)])
    })
  } catch (error) {
    return { ok: false, error: error instanceof SettingsError ? error.message : 'Не удалось сохранить настройки. Попробуй ещё раз.' }
  }
  for (const path of ['/dashboard', '/plan', '/plan/settings', '/learn', '/path', '/olympiads', '/me']) revalidatePath(path)
  return { ok: true }
}
