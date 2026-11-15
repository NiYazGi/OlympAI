'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { getPreparation } from '@/lib/supabase/preparation'
import { trainingToday } from '@/lib/training-time'

export type SessionResult = { ok:boolean; error?:string }
const refresh = () => { revalidatePath('/dashboard'); revalidatePath('/plan'); revalidatePath('/learn'); revalidatePath('/me') }
export async function startTrainingSession(form:FormData) {
  const user=await getVerifiedUser()
  if (!user) redirect('/login')
  const id=String(form.get('session_id') ?? '')
  const preparation=await getPreparation()
  const row=preparation?.plan.sessions.find((session)=>session.id===id)
  if (!row || row.on_date!==trainingToday() || row.completed_at || row.skipped_at || row.superseded_at) redirect('/dashboard')
  const db=await getDb()
  await db.query('update public.preparation_sessions set started_at=coalesce(started_at,now()) where id=$1 and user_id=$2 and completed_at is null and skipped_at is null and superseded_at is null',[id,user.id])
  redirect(`/plan/session/${id}`)
}
export async function finishTrainingSession(_previous:SessionResult|null,form:FormData):Promise<SessionResult> {
  const user=await getVerifiedUser()
  if (!user) return {ok:false,error:'Сессия истекла. Войди снова.'}
  const preparation=await getPreparation()
  const session=preparation?.plan.sessions.find((row)=>row.id===String(form.get('session_id') ?? '')&&row.goal_key===preparation.mockPrefix)
  if (!session || session.on_date!==trainingToday() || session.completed_at || session.skipped_at || session.superseded_at) return {ok:false,error:'План обновился. Открой сегодняшнее занятие с главной.'}
  const minutes=Number(form.get('actual_minutes'))
  const reflection=String(form.get('reflection') ?? '').trim()
  if (!Number.isInteger(minutes) || minutes<1 || minutes>720 || reflection.length>2000) return {ok:false,error:'Укажи время от 1 до 720 минут и заметку не длиннее 2000 символов.'}
  const db=await getDb()
  const saved=await db.transaction(async(tx)=>{
    const updated=await tx.query(`update public.preparation_sessions set completed_at=now(),started_at=coalesce(started_at,now()),actual_minutes=$3,reflection=$4
      where id=$1 and user_id=$2 and completed_at is null and superseded_at is null and skipped_at is null returning id`,[session.id,user.id,minutes,reflection])
    if (!updated.rows.length) return false
    if (session.review_mock_key) {
      const work=(await tx.query<{minutes:number}>(`select coalesce(sum(review_minutes),0)::int as minutes from public.preparation_sessions
        where user_id=$1 and goal_key=$2 and review_mock_key=$3 and completed_at is not null`,[user.id,session.goal_key,session.review_mock_key])).rows[0].minutes
      await tx.query(`update public.mock_tests set preparation_reviewed_at=coalesce(preparation_reviewed_at,now())
        where user_id=$1 and preparation_key=$2 and submitted_at is not null and greatest(10,ceil(duration_minutes/4.0))<=$3`,[user.id,session.goal_key+session.review_mock_key,work])
    }
    return true
  })
  if (!saved) return {ok:false,error:'Занятие уже изменено в другой вкладке. Открой главную.'}
  refresh()
  redirect('/dashboard')
}
export async function skipTrainingSession(form:FormData) {
  const user=await getVerifiedUser()
  if (!user) redirect('/login')
  const preparation=await getPreparation()
  const session=preparation?.plan.sessions.find((row)=>row.id===String(form.get('session_id') ?? '')&&row.goal_key===preparation.mockPrefix)
  if (!session || session.on_date!==trainingToday() || session.completed_at || session.superseded_at) redirect('/dashboard')
  const db=await getDb()
  await db.query('update public.preparation_sessions set skipped_at=coalesce(skipped_at,now()) where id=$1 and user_id=$2 and completed_at is null and superseded_at is null',[session.id,user.id])
  refresh()
  redirect('/dashboard')
}
