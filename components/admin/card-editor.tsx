'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Sparkles } from 'lucide-react'
import { generateTaskCard, saveTaskCard } from '@/app/(app)/admin/opora/actions'
import { MathText } from '@/components/math-text'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import { cardClass, cn, fieldClass } from '@/lib/utils'

export type EditableCard = {
  finalAnswer: string | null
  notation: string | null
  assumptions: string | null
  keySteps: string[]
  mistakes: { mistake: string; fix: string }[]
  hints: { nudge?: string; idea?: string; step?: string; check?: string }
  needsFigure: boolean
  status: 'draft' | 'verified'
  verifiedAt: string | null
}

const areaClass = cn(fieldClass, 'mt-1.5 h-auto min-h-20 py-2.5 font-mono text-[13px] leading-6')

/**
 * The problem's Opora card: the verified basis for every hint. Ready hints on
 * a verified card are shown to students without calling the model.
 */
export function CardEditor({ taskId, card }: { taskId: string; card: EditableCard | null }) {
  const t = useT()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [preview, setPreview] = useState('')

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setNotice(null)
    startTransition(async () => {
      const result = await action()
      setNotice({ ok: result.ok, text: (result.ok ? result.message : result.error) ?? '' })
      if (result.ok) router.refresh()
    })
  }

  const field = (name: string, label: string, value: string, help?: string, rows = 3) => (
    <label className="block text-sm text-ash">
      {label}
      <textarea name={name} rows={rows} defaultValue={value} onFocus={(e) => setPreview(e.target.value)} onChange={(e) => setPreview(e.target.value)} className={areaClass} />
      {help ? <span className="mt-1 block text-[11px] text-smoke">{help}</span> : null}
    </label>
  )

  return (
    <section className={cn(cardClass, 'space-y-4 p-5 sm:p-6')} id="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-medium text-foreground">{t('Opora card')}</h2>
          <p className="mt-0.5 text-xs text-ash">
            {card
              ? card.status === 'verified'
                ? t('Verified. Its ready hints are shown without the model.')
                : t('Draft. The model uses it, but its ready hints are not shown until it is verified.')
              : t('No card yet. Sulu works from the reference solution until one is prepared.')}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => run(() => generateTaskCard(taskId))}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {card ? t('Regenerate draft') : t('Generate draft')}
        </Button>
      </div>

      <form
        key={card ? JSON.stringify(card) : 'empty'}
        action={(formData) => run(() => saveTaskCard(taskId, formData))}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start"
      >
        <div className="space-y-3">
          {field('final_answer', t('Final answer'), card?.finalAnswer ?? '', t('Never shown before the walkthrough. A hint that contains it is replaced.'), 2)}
          {field('notation', t('Notation'), card?.notation ?? '', t('One quantity per line: symbol — meaning. Keep easily confused ones apart.'), 4)}
          {field('assumptions', t('Assumptions'), card?.assumptions ?? '', undefined, 2)}
          {field('key_steps', t('Key steps, one per line'), card?.keySteps.join('\n') ?? '', undefined, 6)}
          {field('mistakes', t('Typical mistakes, one per line: mistake → what to notice'), card?.mistakes.map((m) => `${m.mistake} → ${m.fix}`).join('\n') ?? '', undefined, 4)}
        </div>
        <div className="space-y-3">
          {field('hint_nudge', t('1 · Nudge: where to look, no formulas'), card?.hints.nudge ?? '')}
          {field('hint_idea', t('2 · Idea: which law and why'), card?.hints.idea ?? '')}
          {field('hint_step', t('3 · Step: one concrete equation to set up'), card?.hints.step ?? '')}
          {field('hint_check', t('5 · Check: a question with a changed condition'), card?.hints.check ?? '')}
          <label className="flex items-center gap-2 text-sm text-ash">
            <input type="checkbox" name="needs_figure" defaultChecked={card?.needsFigure ?? false} className="size-4 accent-coral" />
            {t('Cannot be solved without the figure')}
          </label>
          <label className="flex items-center gap-2 text-sm text-ash">
            <input type="checkbox" name="verified" defaultChecked={card?.status === 'verified'} className="size-4 accent-coral" />
            {t('I checked this card: mark it verified')}
          </label>
          <div className="rounded-lg bg-foreground/[0.03] p-3 text-[14px] text-foreground">
            <p className="mb-1 text-[11px] text-smoke">{t('Preview of the field you are editing')}</p>
            {preview.trim() ? <MathText text={preview} /> : <p className="text-sm text-smoke">{t('Nothing written yet.')}</p>}
          </div>
          {notice?.text ? (
            <p role="status" className={cn('text-sm', notice.ok ? 'text-success' : 'text-coral')}>
              {notice.text}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t('Save card')}
          </Button>
        </div>
      </form>
    </section>
  )
}
