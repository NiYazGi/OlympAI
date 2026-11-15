'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Lightbulb, Loader2 } from 'lucide-react'
import { recordDiagnosticAnswer, revealDiagnosticHint, finishDiagnostic } from '@/app/(app)/diagnostic/actions'
import { Button } from '@/components/ui/button'
import { MathLine } from '@/components/sulu/rich-message'
import type { Assistance, DiagnosticAnswers, PublicDiagnosticQuestion } from '@/lib/diagnostic'

const DIMENSIONS = { knowledge: 'Знания', methods: 'Выбор метода', presentation: 'Логика и оформление' }

export function DiagnosticRunner({ runId, savedAnswers, questions, statements }: {
  runId: string
  savedAnswers: DiagnosticAnswers
  questions: PublicDiagnosticQuestion[]
  statements: Record<string, ReactNode>
}) {
  const [answers, setAnswers] = useState<DiagnosticAnswers>(savedAnswers)
  const initial = questions.findIndex((question) => !savedAnswers[question.id] || savedAnswers[question.id].choice < -1)
  const [index, setIndex] = useState(initial < 0 ? questions.length : initial)
  const [hints, setHints] = useState<Record<string, string>>({})
  const [assistance, setAssistance] = useState<Assistance | ''>('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [pending, transition] = useTransition()
  const question = questions[index]
  const answered = questions.filter((item) => answers[item.id] && answers[item.id].choice >= -1).length
  function next() {
    if (!question || answers[question.id]?.choice === undefined || answers[question.id].choice < -1) return
    setError('')
    transition(async () => {
      try {
        const result = await recordDiagnosticAnswer(runId, question.id, answers[question.id].choice)
        if (result.ok) setIndex((value) => value + 1)
        else setError(result.error ?? 'Ответ не сохранился.')
      } catch { setError('Ответ не сохранился. Проверь соединение и попробуй ещё раз.') }
    })
  }
  function hint() {
    if (!question) return
    setError('')
    transition(async () => {
      try {
        const result = await revealDiagnosticHint(runId, question.id)
        if (result.ok && 'hint' in result && result.hint) {
          setHints((current) => ({ ...current, [question.id]: result.hint! }))
          setAnswers((current) => ({ ...current, [question.id]: { choice: current[question.id]?.choice ?? -2, hintUsed: true } }))
        } else setError(result.error ?? 'Подсказка недоступна.')
      } catch { setError('Подсказка не загрузилась. Попробуй ещё раз.') }
    })
  }
  function complete() {
    if (!assistance) return
    setError('')
    transition(async () => {
      try {
        const result = await finishDiagnostic(runId, assistance, note)
        if (!result.ok) setError(result.error ?? 'Результат не сохранился.')
      } catch { setError('Результат не сохранился. Проверь соединение и попробуй ещё раз.') }
    })
  }
  return <section aria-label="Начальная диагностика" className="space-y-5">
    <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{question ? `Вопрос ${index + 1} из ${questions.length}` : 'Самостоятельность и завершение'}</span><span className="tabular-nums text-muted-foreground">{answered}/{questions.length}</span></div>
    <div role="progressbar" aria-label="Вопросы диагностики" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={questions.length} className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${answered / questions.length * 100}%` }} /></div>
    {question ? <div key={question.id} className="feedback-arrive space-y-5 rounded-2xl border border-border p-5 sm:p-6">
      <p className="eyebrow">{DIMENSIONS[question.dimension]}</p>
      <div className="text-lg leading-relaxed font-medium">{statements[question.id]}</div>
      <fieldset disabled={pending} className="space-y-2"><legend className="sr-only">Выбери ответ</legend>
        {[...question.options, 'Пока не знаю'].map((option, optionIndex) => {
          const choice = optionIndex === question.options.length ? -1 : optionIndex
          const checked = answers[question.id]?.choice === choice
          return <label key={choice} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
            <input type="radio" name={`diagnostic-${question.id}`} value={choice} checked={checked} onChange={() => setAnswers((current) => ({ ...current, [question.id]: { choice, hintUsed: current[question.id]?.hintUsed ?? false } }))} className="mt-1 accent-[var(--brand)]" />
            <MathLine text={option} />
          </label>
        })}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="ghost" size="sm" onClick={hint} disabled={pending}><Lightbulb aria-hidden className="size-4" />{answers[question.id]?.hintUsed ? 'Показать подсказку ещё раз' : 'Нужна подсказка'}</Button><span className="text-xs text-muted-foreground">Использование подсказки будет отмечено в результате.</span></div>
      {hints[question.id] ? <p role="status" className="rounded-xl bg-muted p-4 text-sm leading-relaxed">{hints[question.id]}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="outline" disabled={pending || index === 0} onClick={() => setIndex((value) => value - 1)}><ArrowLeft aria-hidden className="size-4" />Назад</Button><Button type="button" disabled={pending || answers[question.id]?.choice === undefined || answers[question.id].choice < -1} onClick={next}>{pending ? <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" /> : null}{index === questions.length - 1 ? 'К завершению' : 'Сохранить и далее'}<ArrowRight aria-hidden className="size-4" /></Button></div>
      <p className="text-xs text-muted-foreground">Сохранённые ответы можно продолжить после перезагрузки. Ответы и разбор появятся после завершения.</p>
    </div> : <div className="space-y-5 rounded-2xl border border-border p-5 sm:p-6">
      <div><h2 className="text-lg font-semibold">Как ты работал?</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Это самоотчёт, а не оценка жюри. Он поможет подобрать подходящую поддержку. Открытых подсказок: {questions.filter((item) => answers[item.id]?.hintUsed).length} из {questions.length}.</p></div>
      <fieldset disabled={pending} className="space-y-2"><legend className="sr-only">Помощь при выполнении</legend>{([['alone', 'Самостоятельно, без чужого решения'], ['small-help', 'Иногда обращался за небольшой помощью'], ['guided', 'Решал вместе с человеком или по готовому разбору']] as const).map(([value, label]) => <label key={value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3 text-sm"><input type="radio" name="diagnostic-assistance" value={value} checked={assistance === value} onChange={() => setAssistance(value)} className="mt-1 accent-[var(--brand)]" />{label}</label>)}</fieldset>
      <label className="block space-y-2 text-sm font-medium"><span>Своё рассуждение или комментарий — по желанию</span><textarea value={note} maxLength={5000} rows={5} disabled={pending} onChange={(event) => setNote(event.target.value)} placeholder="Почему выбрал метод? Где сомневался? Этот текст сохранится, но не получит автоматическую оценку." className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm font-normal leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
      <p className="text-xs text-muted-foreground">Оформление выше проверялось на выборе корректного обоснования. Развёрнутое собственное решение требует отдельной проверки; по этому тексту балл автоматически не выставляется.</p>
      <div className="flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="outline" onClick={() => setIndex(questions.length - 1)} disabled={pending}><ArrowLeft aria-hidden className="size-4" />К последнему вопросу</Button><Button type="button" onClick={complete} disabled={pending || !assistance}>{pending ? <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" /> : null}Сохранить результат<ArrowRight aria-hidden className="size-4" /></Button></div>
    </div>}
    {error ? <p role="alert" className="rounded-xl bg-muted p-4 text-sm">{error}</p> : null}
  </section>
}
