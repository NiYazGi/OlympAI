import Link from 'next/link'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { getDiagnosticSession, getDiagnosticHistory } from '@/lib/supabase/diagnostic'
import { DiagnosticRunner } from '@/components/diagnostic/runner'
import { DiagnosticResults } from '@/components/diagnostic/results'
import { MathText } from '@/components/math-text'
import { buttonVariants } from '@/components/ui/button'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Начальная диагностика' }

export default async function DiagnosticPage() {
  if (!await getVerifiedUser()) redirect('/login')
  const session = await getDiagnosticSession()
  if (!session) return <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-8"><ClipboardCheck aria-hidden className="size-8 text-primary" /><h1 className="text-2xl font-semibold">Сначала выбери предмет подготовки</h1><p className="text-sm leading-relaxed text-muted-foreground">Диагностика относится к твоему предмету и классу. Задай их в общих настройках подготовки.</p><Link href="/plan/settings" className={buttonVariants()}>Настроить подготовку</Link></div>
  const { run, questions } = session
  const subject = { Mathematics: 'Математика', Physics: 'Физика', Informatics: 'Информатика' }[run.subject] ?? run.subject
  return <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden className="size-4" />На главную</Link>
    {run.result && run.completed_at ? <DiagnosticResults subject={run.subject} result={run.result} completedAt={run.completed_at} history={await getDiagnosticHistory()} /> : <>
      <header><p className="eyebrow">{subject}{run.school_grade ? ` · ${run.school_grade.replace('Grade ', '').replace('University', 'университет')}` : ''}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Начальная диагностика</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Около {session.estimatedMinutes} минут: базовые знания, выбор метода, логика и оформление. Можно воспользоваться подсказкой или честно выбрать «Пока не знаю». Это поможет начать с посильных занятий.</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Проверка не начисляет XP и не завершает темы. Свободное рассуждение сохраняется без автоматического вердикта. Ответы сохраняются после кнопки «Сохранить и далее».</p></header>
      <DiagnosticRunner runId={run.id} savedAnswers={run.answers} questions={questions} statements={Object.fromEntries(questions.map((question) => [question.id, <MathText key={question.id} text={question.prompt} />]))} />
    </>}
  </div>
}
