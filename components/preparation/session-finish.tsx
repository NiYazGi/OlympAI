'use client'
import { useActionState } from 'react'
import { finishTrainingSession } from '@/app/(app)/plan/session/actions'
import { Button } from '@/components/ui/button'

export function SessionFinish({id,minutes}:{id:string;minutes:number}) {
  const [result,action,pending]=useActionState(finishTrainingSession,null)
  return <form action={action} className="space-y-4 rounded-2xl border border-border p-5">
    <input type="hidden" name="session_id" value={id}/>
    <h2 className="font-semibold">Завершить занятие</h2>
    <p className="text-sm leading-relaxed text-muted-foreground">Отметь, когда закончишь выделенное время. Занятие засчитывает работу по плану. Правильность решений и освоение навыков проверяются отдельно.</p>
    <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
      <label className="space-y-1.5 text-sm"><span className="block">Фактически, мин</span><input name="actual_minutes" type="number" min={1} max={720} defaultValue={minutes} required className="h-10 w-full rounded-lg border border-border bg-background px-3"/></label>
      <label className="space-y-1.5 text-sm"><span className="block">Что понял и что осталось разобрать</span><textarea name="reflection" maxLength={2000} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2"/></label>
    </div>
    {result?.error?<p role="alert" className="text-sm text-muted-foreground">{result.error}</p>:null}
    <Button type="submit" disabled={pending}>{pending?'Сохраняем…':'Завершить на сегодня'}</Button>
  </form>
}
