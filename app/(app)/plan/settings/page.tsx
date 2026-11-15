import Link from 'next/link'
import { ArrowLeft, History } from 'lucide-react'
import { redirect } from 'next/navigation'
import { PreparationSettingsForm } from '@/components/preparation/settings-form'
import { getPreparationPersonalGoal, getTrainingSettings } from '@/lib/supabase/preparation-settings'
import { getCompetitionOptions, getCurrentProfile, getSubjectSummary } from '@/lib/supabase/queries'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Настройки подготовки' }

export default async function PreparationSettingsPage({ searchParams }: { searchParams: Promise<{ before?: string; competition?: string }> }) {
  const { before, competition: competitionId } = await searchParams
  const [settings, competitions, subjects, profile] = await Promise.all([
    getTrainingSettings(), getCompetitionOptions(), getSubjectSummary(), getCurrentProfile(),
  ])
  if (!profile) redirect('/login')
  if (profile.role === 'teacher') redirect('/class')
  const requested=competitions.find((entry)=>entry.id===competitionId)
  const preview=requested?{...settings,goal:{...settings.goal,competition:requested,subjectId:requested.subjectId??settings.goal.subjectId,subjectName:requested.subjectName??settings.goal.subjectName,subjectLocked:Boolean(requested.subjectId)}}:settings
  const personal = before ? await getPreparationPersonalGoal(before) : settings
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
    <Link href="/plan" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden className="size-4" />К программе</Link>
    <header><h1 className="text-3xl font-semibold tracking-tight">Все настройки подготовки</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Цель, сроки и доступное время — в одном месте. Изменения не требуют начинать с нуля: завершённая работа остаётся в истории.</p></header>
    <PreparationSettingsForm key={preview.goal.competition?.id ?? 'new'} settings={preview} competitions={competitions} subjects={subjects} today={today} />
    <section id="goal-history" className="border-t border-border pt-6" aria-labelledby="goal-history-title">
      <h2 id="goal-history-title" className="flex items-center gap-2 text-xl font-semibold"><History aria-hidden className="size-5" />История моей цели</h2>
      <p className="mt-2 text-sm text-muted-foreground">Записи сохраняются при изменении цели или настроек. Их можно перечитать; новые версии не стирают прежние.</p>
      {personal.history.length ? <ol className="mt-4 space-y-3">{personal.history.map((entry, index) => <li key={entry.id}><details className="evidence-disclosure rounded-2xl border border-border p-4" open={index === 0}>
        <summary className="cursor-pointer text-sm font-medium">{new Date(entry.createdAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Almaty' })}{index === 0 && !before ? ' · последняя запись' : ''}</summary>
        <div className="disclosure-body mt-3 space-y-3 text-sm leading-relaxed"><p className="font-medium">{entry.snapshot.competitionName}</p><p className="text-xs text-muted-foreground">{entry.snapshot.schoolGrade} класс · цель {new Date(`${entry.snapshot.targetDate}T00:00:00Z`).toLocaleDateString('ru-RU', { dateStyle: 'medium', timeZone: 'UTC' })} · {entry.snapshot.weekdays.length * entry.snapshot.sessionMinutes} мин/нед</p><div><h3 className="text-xs font-medium text-muted-foreground">Желаемый результат</h3><p className="mt-1 whitespace-pre-wrap">{entry.desiredResult || 'Пока не записан.'}</p></div><div><h3 className="text-xs font-medium text-muted-foreground">Зачем мне это нужно</h3><p className="mt-1 whitespace-pre-wrap">{entry.why || 'Можно добавить своими словами в форме выше.'}</p></div></div>
      </details></li>)}</ol> : <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">После первого сохранения здесь появится твоя запись.</p>}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-primary">{before ? <Link href="/plan/settings#goal-history" className="hover:underline">К последним записям</Link> : null}{personal.nextHistoryCursor ? <Link href={`/plan/settings?before=${encodeURIComponent(personal.nextHistoryCursor)}#goal-history`} className="hover:underline">Более ранние записи →</Link> : null}</div>
    </section>
  </div>
}
