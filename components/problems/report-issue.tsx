'use client'

import { useState, useTransition } from 'react'
import { Flag, Loader2 } from 'lucide-react'
import { reportTaskIssue } from '@/app/(app)/tasks/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useT } from '@/components/i18n-provider'

/**
 * A quiet link that opens into a one-field form. The task and the attempt are
 * attached by the caller, so the student only says what looks wrong.
 */
export function ReportIssue({
  taskId,
  attemptId = null,
  kind,
}: {
  taskId: string
  attemptId?: string | null
  kind: 'grading' | 'statement'
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  if (notice?.ok) {
    return <p className="text-xs text-muted-foreground">{notice.text}</p>
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <Flag className="size-3" />
        {kind === 'grading' ? t('I think the check is wrong') : t('Report a mistake in the statement')}
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={
          kind === 'grading'
            ? t('Which remark is wrong, and why? For example: "Q41 = 3p0V0/4 is right, the volume is constant on 4→1."')
            : t('What is wrong in the statement: a typo, a missing condition, a figure?')
        }
        className="min-h-20 text-sm"
        maxLength={2000}
        autoFocus
      />
      {notice ? (
        <p role="alert" className="text-xs text-destructive">
          {notice.text}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending || !message.trim()}
          onClick={() =>
            startTransition(async () => {
              const result = await reportTaskIssue({ taskId, attemptId, kind, message })
              setNotice(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error })
            })
          }
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Flag className="size-3.5" />}
          {t('Send for review')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          {t('Cancel')}
        </Button>
      </div>
    </div>
  )
}
