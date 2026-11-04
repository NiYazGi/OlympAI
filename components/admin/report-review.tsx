'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { resolveReport } from '@/app/(app)/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useT } from '@/components/i18n-provider'

/** The answer to one report, and for a grading report an optional new score. */
export function ReportReview({ reportId, canRegrade }: { reportId: string; canRegrade: boolean }) {
  const t = useT()
  const [resolution, setResolution] = useState('')
  const [score, setScore] = useState('')
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function settle(status: 'resolved' | 'rejected') {
    setNotice(null)
    startTransition(async () => {
      const result = await resolveReport({
        reportId,
        status,
        resolution,
        regrade: canRegrade && score.trim() ? { score: Number(score) } : null,
      })
      setNotice({ ok: result.ok, text: (result.ok ? result.message : result.error) ?? '' })
    })
  }

  if (notice?.ok) return <p className="text-sm text-success">{notice.text}</p>

  return (
    <div className="space-y-2">
      <Textarea
        value={resolution}
        onChange={(event) => setResolution(event.target.value)}
        placeholder={t('Answer for the student: what was checked and what changed')}
        className="min-h-16 text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        {canRegrade ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {t('New score')}
            <Input
              value={score}
              onChange={(event) => setScore(event.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder="—"
              className="h-8 w-16 text-sm"
            />
          </label>
        ) : null}
        <Button size="sm" disabled={pending || !resolution.trim()} onClick={() => settle('resolved')}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {t('Fixed')}
        </Button>
        <Button size="sm" variant="outline" disabled={pending || !resolution.trim()} onClick={() => settle('rejected')}>
          {t('No change needed')}
        </Button>
      </div>
      {notice ? (
        <p role="alert" className="text-xs text-destructive">
          {notice.text}
        </p>
      ) : null}
    </div>
  )
}
