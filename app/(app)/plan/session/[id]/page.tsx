import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BookOpen, ClipboardCheck, PenLine, Timer, RotateCcw } from 'lucide-react'
import { getDailySession } from '@/lib/supabase/daily-preparation'
import { getReference } from '@/lib/supabase/reference'
import { getPreparation } from '@/lib/supabase/preparation'
import { skipTrainingSession } from '../actions'
import { SessionFinish } from '@/components/preparation/session-finish'
import { Button,buttonVariants } from '@/components/ui/button'
import { SessionMockStart } from '@/components/preparation/session-mock-start'
import { trainingMinutes,trainingToday } from '@/lib/training-time'
import { getT } from '@/lib/i18n/server'
import { diagnosticSupport } from '@/lib/diagnostic-support'

export const dynamic='force-dynamic'
export const metadata={title:'Сегодняшнее занятие'}
const part=(value:number,total:number)=>total>1?` · часть ${value}/${total}`:''
export default async function SessionPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params
  const [storedSession,reference,t]=await Promise.all([getDailySession(id),getReference(),getT()])
  if (!storedSession) notFound()
  const preparation=await getPreparation()
  const support=preparation?diagnosticSupport(preparation.diagnostic,preparation.subject):[]
  const session=preparation?.plan.sessions.find((row)=>row.id===id) ?? storedSession
  const belongs=preparation?.plan.sessions.some((row)=>row.id===id&&row.goal_key===preparation.mockPrefix&&!row.superseded_at&&!row.skipped_at)
  const stale=Boolean(session.skipped_at||session.superseded_at||!session.completed_at&&(!belongs||session.on_date<trainingToday()))
  const today=session.on_date===trainingToday()
  const activityQuery=today&&!session.completed_at&&!stale?`?session=${id}`:''
  const topic=reference.topics.find((item)=>item.id===session.topic_id)
  const mock=session.goal_key===preparation?.mockPrefix?preparation?.plan.steps.find((step)=>step.id===session.mock_key):undefined
  const row=(title:string,minutes:number,href:string,Icon:typeof BookOpen,description?:string)=><li key={title} className="flex items-start gap-3 rounded-xl border border-border p-4"><Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary"/><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{title}</h2>{description?<p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>:null}<p className="mt-2 text-sm text-primary">{trainingMinutes(minutes)}</p></div><Link href={href} className="shrink-0 text-sm font-medium hover:underline">Открыть →</Link></li>
  return <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4"/>На главную</Link>
    <header><p className="eyebrow">Занятие · {session.on_date}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{session.session_kind==='mock'?'Пробный тур':session.session_kind==='review'?'Разбор и закрепление':topic?.name==='Mathematics'?'Практика':topic?t(topic.name):'Подготовка'}</h1><p className="mt-3 text-muted-foreground">{trainingMinutes(session.minutes)} с учётом разбора. По окончании выделенного времени можно остановиться и сохранить черновик.</p></header>
    {stale?<div className="rounded-2xl bg-muted p-5"><h2 className="font-semibold">Это занятие уже перепланировано</h2><p className="mt-2 text-sm text-muted-foreground">Его оставшаяся работа учтена в новом плане. Проходить два занятия за один день не требуется.</p><Link href="/dashboard" className="mt-4 inline-block font-medium text-primary">Открыть актуальное занятие →</Link></div>:<>
      {!today&&!session.completed_at?<p className="rounded-xl bg-muted p-4 text-sm">Это план на будущую дату. Сегодняшняя нагрузка указана на главной.</p>:null}
      <ol className="space-y-3">
        {session.lesson_id&&session.lesson_minutes>0&&topic?row('Конспект'+part(session.lesson_part,session.lesson_parts),session.lesson_minutes,`/learn/${topic.slug}/lesson${activityQuery}`,BookOpen,session.lesson_parts>1?'Читаем по частям: на сегодня выделен этот блок времени. Не нужно заканчивать весь конспект за один подход.':undefined):null}
        {!session.mock_key?session.task_ids.map((taskId,index)=>{const task=reference.tasks.find((item)=>item.id===taskId);return task?row(task.title+part(session.task_parts[index],session.task_part_totals[index]),session.task_minutes[index]??0,`/tasks/${encodeURIComponent(taskId)}${activityQuery}`,PenLine,session.task_part_totals[index]>1?'Продолжение одной задачи. Черновик решения сохраняется в редакторе; оставшееся время уже выделено в следующих занятиях.':undefined):null}):null}
        {session.quiz_minutes>0&&topic?row('Квиз'+part(session.quiz_part,session.quiz_parts),session.quiz_minutes,`/learn/${topic.slug}/quiz${activityQuery}`,ClipboardCheck):null}
      </ol>
      {session.mock_key?<section className="rounded-2xl border border-border p-5"><div className="flex items-center gap-2"><Timer className="size-5 text-primary"/><h2 className="font-semibold">Пробник в пределах выбранного времени</h2></div><p className="mt-2 text-sm text-muted-foreground">{session.full_paper?'Полный тур.':'Тренировочный тур с ограничением времени, не полный официальный тур.'} Разбор запланирован отдельно и входит в общий бюджет.</p>{mock?.href?.startsWith('/mock/')?<Link href={mock.href} className={buttonVariants({className:'mt-4'})}>Открыть тур</Link>:today&&mock&&preparation?<SessionMockStart step={mock.id} scope={preparation.mockPrefix}/>:null}</section>:null}
      {session.review_minutes>0?<section id="review" className="scroll-mt-6 rounded-2xl bg-muted/60 p-5"><div className="flex items-center gap-2"><RotateCcw className="size-5 text-primary"/><h2 className="font-semibold">Разбор · {trainingMinutes(session.review_minutes)}{part(session.review_part,session.review_parts)}</h2></div><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground"><li>Отметь, где остановилось рассуждение и какая идея была нужна.</li><li>Сравни своё решение с обратной связью, проверь обозначения и обоснования.</li><li>Закрой разбор и попробуй воспроизвести ключевой шаг самостоятельно.</li></ol>{support.length?<div className="mt-4 border-t border-border pt-4"><h3 className="text-sm font-semibold">По твоей диагностике</h3><p className="mt-1 text-xs text-muted-foreground">Эти пункты заменяют часть общего разбора и входят в его минуты.</p><ul className="mt-3 space-y-3">{support.map((item)=><li key={item.id} className="text-sm leading-relaxed"><p className="font-medium">{item.title}</p><p className="mt-1 text-muted-foreground">{item.instruction}</p></li>)}</ul></div>:null}{session.review_mock_key&&preparation?<Link href={preparation.plan.steps.find((step)=>step.id===session.review_mock_key)?.href ?? '/mock'} className="mt-3 inline-block text-sm font-medium text-primary">Открыть пробный тур →</Link>:null}<p className="mt-3 text-xs text-muted-foreground">В последние пять дней — только лёгкое повторение. Последние два дня полностью свободны от учебных заданий.</p></section>:null}
      {session.completed_at?<p className="rounded-xl bg-muted p-4 text-sm">Занятие завершено. {session.reflection??'Запись сохранена в истории календаря.'}</p>:today?<><SessionFinish id={id} minutes={session.minutes}/><form action={skipTrainingSession}><input type="hidden" name="session_id" value={id}/><Button variant="ghost" type="submit">Сегодня не могу заниматься — перепланировать</Button><p className="mt-1 text-xs text-muted-foreground">Сегодня станет днём отдыха. Следующие занятия останутся в пределах согласованного времени.</p></form></>:null}
    </>}
  </div>
}
