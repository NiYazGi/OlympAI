import 'server-only'

import { createHash } from 'node:crypto'
import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/supabase/auth'
import { planDailySessions, type DailyDraft, type DailyTopic } from '@/lib/daily-preparation'
import { preparationCalendar, preparationPhase, type PreparationCalendarDay } from '@/lib/preparation-phases'
import { isCompetitionTask } from '@/lib/competition-analysis'
import { addSessionWork } from '@/lib/training-work'
import type { PreparationInput, PreparationPlan, PreparationStep } from '@/lib/preparation'

const VERSION = 'time-budget-v3'
// Rebuild derived future assignments after allocator fixes, retaining saved
// sessions and completed work under the existing persisted data version.
const PLANNER_REVISION = '2026-11-15-question-chunks-reservations-min-fragment-v2'
export type DailySession = DailyDraft & {
  id: string; user_id: string; scope: string; goal_key: string; plan_version: string
  budget_minutes: number | null; created_at: string; started_at: string | null
  completed_at: string | null; skipped_at: string | null; superseded_at: string | null
  lesson_completed_at: string | null; quiz_completed_at: string | null
  actual_minutes: number | null; reflection: string | null
}
export type TrainingCalendarDay = PreparationCalendarDay & {
  sessions: DailySession[]; plannedMinutes: number; completedMinutes: number
  kind: 'study'|'mock'|'review'|'rest'|'day-off'|'missed'|'goal'
}
export type TrainingPlan = PreparationPlan & {
  sessions: DailySession[]; calendar: TrainingCalendarDay[]; today: string
  phase: PreparationCalendarDay['phase']; missedSessions: number
  replanned: boolean; diagnosticMinutes: number
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const active = (session: DailySession) => !session.completed_at && !session.skipped_at && !session.superseded_at
const part = (number: number, total: number) => total > 1 ? ` · часть ${number}/${total}` : ''

export async function getDailySession(id: string | undefined) {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null
  const userId = await getSessionUserId()
  if (!userId) return null
  const db = await getDb()
  return (await db.query<DailySession>('select * from public.preparation_sessions where id=$1 and user_id=$2', [id,userId])).rows[0] ?? null
}

export async function getDailyPreparation(input: PreparationInput, topics: DailyTopic[], mockPrefix: string): Promise<TrainingPlan> {
  const userId = await getSessionUserId()
  if (!userId) throw new Error('A daily program requires a session')
  const scope = hash([mockPrefix,input.targetDate,input.preferences,VERSION])
  const db = await getDb()
  const topicById = new Map(topics.map((topic) => [topic.id,topic]))
  const rawCalendar = preparationCalendar({ ...input,reservedMinutesByDate:{} })
  const todayCap = rawCalendar.find((day) => day.date === input.today)?.capacityMinutes ?? 0
  const result = await db.transaction(async (tx) => {
    // Derived plans are serialized together. A refresh never creates two daily assignments.
    for (const mock of input.mocks.filter((paper) => paper.completedAt)) {
      await tx.query(`update public.preparation_sessions set completed_at=$4,actual_minutes=minutes
        where user_id=$1 and goal_key=$2 and mock_key=$3 and plan_version=$5 and completed_at is null
        and skipped_at is null and superseded_at is null`,[userId,mockPrefix,mock.key,mock.completedAt,VERSION])
    }
    // Opening a paper directly from the full route must lock the same daily
    // timebox as starting it from the dashboard. Also repairs older open papers
    // created before the start action recorded the route session's timestamp.
    for (const mock of input.mocks.filter((paper) => !paper.completedAt)) {
      await tx.query(`update public.preparation_sessions set started_at=coalesce(started_at,$4)
        where user_id=$1 and goal_key=$2 and mock_key=$3 and plan_version=$5
        and completed_at is null and skipped_at is null and superseded_at is null`,[userId,mockPrefix,mock.key,mock.startedAt,VERSION])
    }
    let { rows } = await tx.query<DailySession>(
      'select * from public.preparation_sessions where user_id=$1 and (goal_key=$2 or on_date=$4) and plan_version=$3 order by on_date,created_at',
      [userId,mockPrefix,VERSION,input.today],
    )
    const timedWork: Record<string,number> = { ...input.workCompleted }
    const doneToday = rows.some((row) => row.on_date === input.today && (row.completed_at || row.skipped_at))
    const reservations = { ...input.reservedMinutesByDate }
    if (doneToday) reservations[input.today] = todayCap
    const legacySplitQuiz = (row: DailySession) => row.quiz_parts > 1 && row.quiz_minutes > 0 &&
      row.question_ids.length === (topicById.get(row.topic_id ?? '')?.questionIds.length ?? 0)
    const incompatibleStarted = rows.find((row) => row.on_date===input.today && active(row) &&
      (row.started_at || row.lesson_completed_at || row.quiz_completed_at) &&
      (row.scope!==scope || legacySplitQuiz(row) || row.minutes>Math.max(0,todayCap-(reservations[input.today] ?? 0))))
    if (incompatibleStarted) {
      // A changed budget/diagnostic never adds another whole session on top of
      // work already started today. Continue under the new plan next study day.
      const skippedAt=new Date().toISOString()
      await tx.query('update public.preparation_sessions set skipped_at=$3 where id=$1 and user_id=$2',[incompatibleStarted.id,userId,skippedAt])
      incompatibleStarted.skipped_at=skippedAt
      reservations[input.today]=todayCap
    }
    const preserved = rows.find((row) => row.scope === scope && row.on_date === input.today && active(row) &&
      (row.started_at || row.lesson_completed_at || row.quiz_completed_at) && row.minutes <= Math.max(0,todayCap-(reservations[input.today] ?? 0)))
    const planningReservations = { ...reservations }
    for (const row of rows) if (row.id!==preserved?.id) addSessionWork(timedWork,row,false,topicById.get(row.topic_id ?? '')?.slug)
    if (preserved) {
      // One assignment per day: do not generate another draft in spare room
      // and then silently discard its first chunks on the unique-key conflict.
      planningReservations[input.today] = todayCap
      addSessionWork(timedWork,preserved,true,topicById.get(preserved.topic_id ?? '')?.slug)
    }
    const completedIds = rows.filter((row) => row.completed_at || row.lesson_completed_at || row.quiz_completed_at || row.skipped_at || active(row) && row.on_date<input.today)
      .map((row) => [row.id,row.completed_at,row.lesson_completed_at,row.quiz_completed_at,Boolean(row.skipped_at || active(row) && row.on_date<input.today)])
    const fingerprint = hash([PLANNER_REVISION,input.today,scope,completedIds,[...input.completedTasks],input.mocks,
      topics.map((topic) => [topic.id,topic.mastery,topic.lesson?.completedAt,topic.quiz?.completedAt]),input.skillPriorities,input.reservedMinutesByDate,input.day])
    const state = (await tx.query<{fingerprint:string}>(
      'select fingerprint from public.preparation_plan_state where user_id=$1 and scope=$2', [userId,scope],
    )).rows[0]
    const replanned = state?.fingerprint !== fingerprint
    if (replanned) {
      await tx.query(`update public.preparation_sessions set skipped_at=now()
        where user_id=$1 and goal_key=$2 and plan_version=$3 and on_date<$4
        and completed_at is null and skipped_at is null and superseded_at is null`,[userId,mockPrefix,VERSION,input.today])
      await tx.query(`update public.preparation_sessions set superseded_at=now()
        where user_id=$1 and goal_key=$2 and plan_version=$3 and on_date>=$4
        and completed_at is null and skipped_at is null and superseded_at is null
        and ($5::uuid is null or id<>$5::uuid)`,[userId,mockPrefix,VERSION,input.today,preserved?.id ?? null])
      const drafts = planDailySessions({ ...input,workCompleted:timedWork,reservedMinutesByDate:planningReservations },topics)
      const caps = new Map(preparationCalendar({ ...input,reservedMinutesByDate:planningReservations }).map((day) => [day.date,day.capacityMinutes]))
      const payload = drafts.map((draft) => ({ ...draft,budget_minutes:caps.get(draft.on_date) ?? 0 }))
      if (payload.length) await tx.query(`insert into public.preparation_sessions
        (user_id,scope,goal_key,plan_version,on_date,topic_id,lesson_id,task_ids,question_ids,minutes,mock_key,full_paper,
         phase,session_kind,budget_minutes,lesson_minutes,task_minutes,quiz_minutes,review_minutes,lesson_part,lesson_parts,
         task_parts,task_part_totals,quiz_part,quiz_parts,review_mock_key,review_part,review_parts)
        select $1,$2,$3,$4,d.* from jsonb_to_recordset($5::jsonb) as d(
          on_date date,topic_id uuid,lesson_id text,task_ids text[],question_ids text[],minutes int,mock_key text,full_paper boolean,
          phase text,session_kind text,budget_minutes int,lesson_minutes int,task_minutes int[],quiz_minutes int,review_minutes int,
          lesson_part int,lesson_parts int,task_parts int[],task_part_totals int[],quiz_part int,quiz_parts int,
          review_mock_key text,review_part int,review_parts int)
        on conflict (user_id,scope,on_date) where completed_at is null and skipped_at is null and superseded_at is null do nothing`,
      [userId,scope,mockPrefix,VERSION,JSON.stringify(payload)])
      await tx.query(`insert into public.preparation_plan_state(user_id,scope,fingerprint) values($1,$2,$3)
        on conflict(user_id,scope) do update set fingerprint=excluded.fingerprint,updated_at=now()`,[userId,scope,fingerprint])
      rows = (await tx.query<DailySession>('select * from public.preparation_sessions where user_id=$1 and (goal_key=$2 or on_date=$4) and plan_version=$3 order by on_date,created_at', [userId,mockPrefix,VERSION,input.today])).rows
    }
    const visible = rows.filter((row) => row.completed_at || row.skipped_at && !row.superseded_at || row.scope === scope && !row.superseded_at)
    return { rows:visible,replanned,reservations }
  })
  const sessions = result.rows
  const current = sessions.filter((row) => active(row) && row.scope === scope && row.on_date >= input.today)
  const tasks = new Map(input.tasks.map((task) => [task.id,task]))
  const steps: PreparationStep[] = []
  for (const session of sessions.filter((row) => row.goal_key===mockPrefix && !row.skipped_at && !row.superseded_at)) {
    const href = `/plan/session/${session.id}`
    if (session.mock_key) {
      const mock = input.mocks.find((paper) => paper.key === session.mock_key)
      steps.push({ id:session.mock_key,kind:'mock',title:'Пробный тур',date:session.on_date,minutes:session.minutes,
        href:mock ? `/mock/${mock.id}` : href,completedAt:mock?.completedAt ?? session.completed_at ?? undefined,
        source:session.task_ids.every((id) => isCompetitionTask({id},input.competitionSlug)) ? 'archive':'similar',
        mock:mock ? undefined : {taskIds:session.task_ids,fullPaper:session.full_paper} })
      continue
    }
    const topic = topicById.get(session.topic_id ?? '')
    if (session.lesson_id && session.lesson_minutes > 0) steps.push({ id:`${session.id}-lesson`,kind:'lesson',
      title:(topic?.lesson?.title ?? 'Конспект')+part(session.lesson_part,session.lesson_parts),topic:topic?.name,
      date:session.on_date,minutes:session.lesson_minutes,href:`/learn/${topic?.slug}/lesson?session=${session.id}`,
      completedAt:session.lesson_completed_at ?? session.completed_at ?? undefined })
    session.task_ids.forEach((id,index) => {
      const task = tasks.get(id)
      if (!task || !session.task_minutes[index]) return
      steps.push({id:`${session.id}-${id}`,kind:'task',title:task.title+part(session.task_parts[index],session.task_part_totals[index]),
        topic:topic?.name,date:session.on_date,minutes:session.task_minutes[index],href:`/tasks/${encodeURIComponent(id)}?session=${session.id}`,
        completedAt:input.completedTasks.get(id) ?? session.completed_at ?? undefined,
        source:isCompetitionTask(task,input.competitionSlug)?'archive':'similar'})
    })
    if (session.quiz_minutes>0 && topic) steps.push({id:`${session.id}-quiz`,kind:'quiz',title:topic.name+part(session.quiz_part,session.quiz_parts),
      topic:topic.name,date:session.on_date,minutes:session.quiz_minutes,href:`/learn/${topic.slug}/quiz?session=${session.id}`,
      completedAt:session.quiz_completed_at ?? session.completed_at ?? undefined})
    if (session.review_minutes>0) steps.push({id:`${session.id}-review`,kind:'review',title:session.review_mock_key?'Разбор пробного тура':'Разбор и закрепление',
      date:session.on_date,minutes:session.review_minutes,href:href+'#review',completedAt:session.completed_at ?? undefined})
  }
  const budgetCalendar = preparationCalendar({...input,reservedMinutesByDate:result.reservations})
  const calendar: TrainingCalendarDay[] = budgetCalendar.map((day) => {
    const rows = sessions.filter((session) => session.on_date === day.date)
    const planned = rows.filter(active)
    return {...day,sessions:rows,plannedMinutes:planned.reduce((sum,row)=>sum+row.minutes,0),completedMinutes:rows.filter((row)=>row.completed_at).reduce((sum,row)=>sum+(row.actual_minutes ?? row.minutes),0),
      kind:day.phase==='rest'?'rest':planned.some((row)=>row.session_kind==='mock')?'mock':planned.some((row)=>row.session_kind==='review')?'review':planned.length?'study':rows.some((row)=>row.skipped_at)?'missed':day.studyDay?'rest':'day-off'}
  })
  for (const row of sessions.filter((session)=>session.on_date<input.today)) {
    let day = calendar.find((item)=>item.date===row.on_date)
    if (!day) {
      day={date:row.on_date,phase:row.phase,capacityMinutes:row.budget_minutes ?? row.minutes,studyDay:true,daysLeft:Math.round((Date.parse(input.targetDate)-Date.parse(row.on_date))/86400000),sessions:[],plannedMinutes:0,completedMinutes:0,kind:row.skipped_at?'missed':row.session_kind}
      calendar.push(day)
    }
    day.sessions.push(row)
    if (row.completed_at) day.completedMinutes+=row.actual_minutes ?? row.minutes
  }
  calendar.push({date:input.targetDate,phase:'rest',capacityMinutes:0,studyDay:false,daysLeft:0,sessions:[],plannedMinutes:0,completedMinutes:0,kind:'goal'})
  const preferredMinutes=budgetCalendar.reduce((sum,day)=>sum+day.capacityMinutes,0)
  const scheduledMinutes=current.reduce((sum,row)=>sum+row.minutes,0)
  if (scheduledMinutes>preferredMinutes) throw new Error('Stored program exceeds agreed remaining time')
  return {
    steps:steps.sort((a,b)=>a.date.localeCompare(b.date)),sessions,calendar:calendar.sort((a,b)=>a.date.localeCompare(b.date)),today:input.today,
    phase:preparationPhase(input.today,input.targetDate,input.goalStart),missedSessions:sessions.filter((row)=>row.skipped_at).length,replanned:result.replanned,
    diagnosticMinutes:input.reservedMinutesByDate?.[input.today] ?? 0,
    preferredMinutes,scheduledMinutes,daysLeft:Math.max(0,Math.round((Date.parse(input.targetDate)-Date.parse(input.today))/86400000)),
    hasArchive:input.tasks.some((task)=>isCompetitionTask(task,input.competitionSlug)),hasMaterials:current.length>0 || sessions.some((row)=>row.completed_at),
    adaptedToday:input.day.reported && todayCap<input.preferences.sessionMinutes,priorityOnly:false,
    daily:{tasks:input.preferences.dailyTasks ?? 5,sessions:current.filter((row)=>row.session_kind==='study').length,
      contentShortage:current.length<budgetCalendar.filter((day)=>day.capacityMinutes>0).length,overloadedDays:0},
  }
}
