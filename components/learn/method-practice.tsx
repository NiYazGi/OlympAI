'use client'

import { useState, type FormEvent } from 'react'
import { MathLine } from '@/components/sulu/rich-message'
import { Button } from '@/components/ui/button'
import type { TaskMethod } from '@/lib/task-methods'
import { useT } from '@/components/i18n-provider'

/** A local self-check, explicitly excluded from recorded mastery and XP. */
export function MethodPractice({ practice }: { practice: TaskMethod['practice'] }) {
  const t = useT()
  const [value, setValue] = useState('')
  const [result, setResult] = useState<'correct' | 'retry' | null>(null)
  function check(event: FormEvent) {
    event.preventDefault()
    const parsed = Number(value.trim().replace(',', '.').replace('−', '-'))
    setResult(value.trim() && Number.isFinite(parsed) && Math.abs(parsed - practice.answer) <= (practice.tolerance ?? 0.000001) ? 'correct' : 'retry')
  }
  return <section id="practice" className="scroll-mt-6 rounded-2xl border border-border p-5 sm:p-6">
    <p className="eyebrow">{t('Method practice')}</p>
    <h2 className="mt-2 text-lg font-semibold">{t('Test the idea on a short problem')}</h2>
    <div className="mt-4 text-base leading-relaxed"><MathLine text={practice.question} /></div>
    <form onSubmit={check} className="mt-4 flex flex-wrap items-end gap-3">
      <label className="min-w-0 space-y-1.5 text-sm"><span className="block text-muted-foreground">{t('Answer')}{practice.unit ? `, ${practice.unit}` : ''}</span>
        <input required inputMode="decimal" value={value} onChange={(event) => { setValue(event.target.value); setResult(null) }} className="h-10 w-40 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
      </label>
      <Button type="submit">{t('Check')}</Button>
    </form>
    <div aria-live="polite" className="mt-3 text-sm">
      {result ? <div key={`${result}-${value}`} className="feedback-arrive rounded-xl bg-muted p-3"><p className="font-medium">{result === 'correct' ? t('Correct. Now go back to the original problem.') : t('Not there yet. Check the units and the formula from the lesson.')}</p>{result === 'correct' ? <div className="mt-2"><MathLine text={practice.explanation} /></div> : null}</div> : null}
    </div>
    <details className="evidence-disclosure mt-3 text-sm text-muted-foreground"><summary className="w-fit cursor-pointer hover:text-foreground">{t('Show the solution')}</summary><div className="disclosure-body pt-3"><MathLine text={practice.explanation} /></div></details>
    <p className="mt-4 text-xs text-muted-foreground">{t('Self-check: it gives no XP and does not change skill mastery. Skills are confirmed by solving the linked problems.')}</p>
  </section>
}
