'use client'

import { useState, useTransition } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { toggleSavedTask } from '@/app/(app)/tasks/actions'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'

/** Puts a problem aside for later. The list is under Problems → Saved. */
export function SaveTaskButton({ taskId, initial }: { taskId: string; initial: boolean }) {
  const t = useT()
  const [saved, setSaved] = useState(initial)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !saved
    setSaved(next)
    setError('')
    startTransition(async () => {
      const result = await toggleSavedTask(taskId, next)
      if (!result.ok) {
        setSaved(result.saved)
        setError(result.error ?? '')
      }
    })
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={toggle}
        disabled={pending}
        aria-pressed={saved}
        title={saved ? t('Remove from saved') : t('Save to come back later')}
      >
        {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        {saved ? t('Saved for later') : t('Save')}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  )
}
