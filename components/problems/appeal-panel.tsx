'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Gavel, Loader2 } from 'lucide-react'
import { submitAppeal } from '@/app/(app)/tasks/appeal-actions'
import { AiThinking } from '@/components/ai-thinking'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import type { Appeal } from '@/lib/appeals'
import { cardClass, cn, fieldClass } from '@/lib/utils'

/**
 * The appeal trainer and the real dispute in one panel. The trainer is the
 * default: it teaches the skill without touching the mark.
 */
export function AppealPanel({
  attemptId, taskId, criteria, appeals, canDispute,
}: { attemptId: string; taskId: string; criteria: { text: string; max: number; earned: number }[]; appeals: Appeal[]; canDispute: boolean }) {
  const t = useT()
  const router = useRouter()
  const [mode, setMode] = useState<'practice' | 'dispute'>('practice')
  const lost = criteria.filter((item) => item.earned < item.max)
  const [criterion, setCriterion] = useState(lost[0]?.text ?? criteria[0]?.text ?? '')
  const [lines, setLines] = useState('')
  const [argument, setArgument] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  return (
    <section id="appeal" className={cn(cardClass, 'scroll-mt-20 p-5 sm:p-6')}>
      <h2 className="flex items-center gap-2 font-medium"><Gavel className="size-4 text-coral" /> {t('Appeal')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('At a real olympiad an appeal wins points only with a criterion, exact lines and a calm argument. Practise it here.')}
      </p>

      <div className="mt-4 inline-flex rounded-lg bg-foreground/[0.05] p-1 text-sm">
        <button type="button" onClick={() => setMode('practice')} className={cn('rounded-md px-3 py-1.5', mode === 'practice' && 'bg-card shadow-key')}>{t('Appeal trainer')}</button>
        <button type="button" disabled={!canDispute} onClick={() => setMode('dispute')} className={cn('rounded-md px-3 py-1.5 disabled:opacity-50', mode === 'dispute' && 'bg-card shadow-key')}>{t('Dispute the mark')}</button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {mode === 'practice'
          ? t('Training: the jury answers and rates your argument; the mark does not change.')
          : t('A real re-check: the mark can only go up, and each attempt can be disputed once.')}
      </p>

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          start(async () => {
            const result = await submitAppeal({ attemptId, taskId, mode, criterion, lines, argument })
            if (!result.ok) setError(result.error)
            else {
              setArgument('')
              setLines('')
              router.refresh()
            }
          })
        }}
      >
        {criteria.length ? (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t('Criterion')}</span>
            <select className={fieldClass} value={criterion} onChange={(event) => setCriterion(event.target.value)}>
              {criteria.map((item) => (
                <option key={item.text} value={item.text}>{item.earned}/{item.max} · {item.text.slice(0, 120)}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t('Lines of your solution')}</span>
          <input className={fieldClass} value={lines} onChange={(event) => setLines(event.target.value)} placeholder={t('for example 3, 5-7')} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t('Argument')}</span>
          <textarea
            className={cn(fieldClass, 'min-h-28 py-2')}
            maxLength={3000}
            value={argument}
            onChange={(event) => setArgument(event.target.value)}
            placeholder={t('Which criterion, which lines meet it, and why. Facts, not feelings.')}
          />
        </label>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || argument.trim().length < 20}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === 'practice' ? t('Send to the training jury') : t('Send the appeal')}
          </Button>
          {pending ? <AiThinking kind="grading" /> : null}
        </div>
      </form>

      {appeals.length ? (
        <ul className="mt-5 space-y-3 border-t border-border pt-4">
          {appeals.map((appeal) => (
            <li key={appeal.id} className="space-y-1.5 text-sm">
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-foreground/[0.06] px-1.5 py-0.5">{appeal.mode === 'practice' ? t('trainer') : t('dispute')}</span>
                <span className={cn('font-medium', appeal.verdict === 'rejected' ? 'text-muted-foreground' : 'text-success')}>
                  {appeal.verdict === 'upheld' ? t('upheld') : appeal.verdict === 'partial' ? t('partly upheld') : t('rejected')}
                </span>
                {appeal.mode === 'dispute' && appeal.pointsBefore !== null ? <span>{appeal.pointsBefore} → {appeal.pointsAfter} / 7</span> : null}
                {appeal.argumentScore !== null ? <span>{t('argument {n}/5', { n: appeal.argumentScore })}</span> : null}
              </p>
              {appeal.juryResponse ? <p><span className="font-medium">{t('Jury')}: </span>{appeal.juryResponse}</p> : null}
              {appeal.argumentFeedback ? <p className="text-muted-foreground"><span className="font-medium text-foreground">{t('On your argument')}: </span>{appeal.argumentFeedback}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
