'use client'

import { useState, type FormEvent } from 'react'
import { MathLine } from '@/components/sulu/rich-message'
import { Button } from '@/components/ui/button'
import type { TaskMethod } from '@/lib/task-methods'

/** A local self-check, explicitly excluded from recorded mastery and XP. */
export function MethodPractice({ practice }: { practice: TaskMethod['practice'] }) {
  const [value, setValue] = useState('')
  const [result, setResult] = useState<'correct' | 'retry' | null>(null)
  function check(event: FormEvent) {
    event.preventDefault()
    const parsed = Number(value.trim().replace(',', '.').replace('−', '-'))
    setResult(value.trim() && Number.isFinite(parsed) && Math.abs(parsed - practice.answer) <= (practice.tolerance ?? 0.000001) ? 'correct' : 'retry')
  }
  return <section id="practice" className="scroll-mt-6 rounded-2xl border border-border p-5 sm:p-6">
    <p className="eyebrow">Тренировка метода</p>
    <h2 className="mt-2 text-lg font-semibold">Проверь идею на короткой задаче</h2>
    <div className="mt-4 text-base leading-relaxed"><MathLine text={practice.question} /></div>
    <form onSubmit={check} className="mt-4 flex flex-wrap items-end gap-3">
      <label className="min-w-0 space-y-1.5 text-sm"><span className="block text-muted-foreground">Ответ{practice.unit ? `, ${practice.unit}` : ''}</span>
        <input required inputMode="decimal" value={value} onChange={(event) => { setValue(event.target.value); setResult(null) }} className="h-10 w-40 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
      </label>
      <Button type="submit">Проверить</Button>
    </form>
    <div aria-live="polite" className="mt-3 text-sm">
      {result ? <div key={`${result}-${value}`} className="feedback-arrive rounded-xl bg-muted p-3"><p className="font-medium">{result === 'correct' ? 'Верно. Теперь вернись к исходной задаче.' : 'Пока не сходится. Проверь единицы и формулу из урока.'}</p>{result === 'correct' ? <div className="mt-2"><MathLine text={practice.explanation} /></div> : null}</div> : null}
    </div>
    <details className="evidence-disclosure mt-3 text-sm text-muted-foreground"><summary className="w-fit cursor-pointer hover:text-foreground">Показать разбор</summary><div className="disclosure-body pt-3"><MathLine text={practice.explanation} /></div></details>
    <p className="mt-4 text-xs text-muted-foreground">Самопроверка: не начисляет XP и не меняет освоение навыка. Подтверждение — решения связанных задач.</p>
  </section>
}
