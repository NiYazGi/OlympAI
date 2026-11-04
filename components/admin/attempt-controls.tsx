'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Trash2 } from 'lucide-react'
import { deleteAttempt, rescoreAttempt } from '@/app/(app)/admin/site/actions'
import { useT } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

/** A score that can be corrected in place, and the attempt removed. */
export function AttemptControls({ id, score }: { id: string; score: number }) {
  const t = useT()
  const [value, setValue] = useState(String(Math.round(score)))
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [gone, setGone] = useState(false)
  const [pending, startTransition] = useTransition()

  if (gone) return <span className="text-[11px] text-smoke">{t('Deleted.')}</span>

  const changed = value.trim() !== '' && Number(value) !== Math.round(score)

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="inline-flex items-center gap-1">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
          inputMode="numeric"
          aria-label={t('Score')}
          className="h-7 w-12 rounded-md bg-foreground/[0.05] px-2 text-right font-mono text-xs text-foreground outline-none focus:ring-2 focus:ring-foreground/10"
        />
        <button
          type="button"
          disabled={pending || !changed}
          onClick={() =>
            startTransition(async () => {
              const result = await rescoreAttempt(id, Number(value))
              setNotice({ ok: result.ok, text: (result.ok ? result.message : result.error) ?? '' })
            })
          }
          aria-label={t('Save score')}
          className="rounded-md p-1.5 text-smoke transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-30"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(t('Delete this attempt? It also leaves the student’s statistics.'))) return
            startTransition(async () => {
              const result = await deleteAttempt(id)
              if (result.ok) setGone(true)
              else setNotice({ ok: false, text: result.error ?? '' })
            })
          }}
          aria-label={t('Delete attempt')}
          className="rounded-md p-1.5 text-smoke transition-colors hover:bg-coral/10 hover:text-coral"
        >
          <Trash2 className="size-3.5" />
        </button>
      </span>
      {notice?.text ? <span className={cn('text-[11px]', notice.ok ? 'text-success' : 'text-coral')}>{notice.text}</span> : null}
    </span>
  )
}
