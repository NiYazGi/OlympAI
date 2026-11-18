'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignCohort } from '@/app/(app)/admin/pilot/actions'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import { cn, fieldClass } from '@/lib/utils'

export function PilotForm() {
  const t = useT()
  const router = useRouter()
  const [list, setList] = useState('')
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const run = (cohort: 'pilot' | 'control' | 'none') =>
    start(async () => {
      const result = await assignCohort(list, cohort)
      setNotice({ ok: result.ok, text: result.ok ? result.message ?? '' : result.error ?? '' })
      if (result.ok) {
        setList('')
        router.refresh()
      }
    })
  return (
    <div className="space-y-2">
      <textarea
        className={cn(fieldClass, 'min-h-24 py-2')}
        value={list}
        onChange={(event) => setList(event.target.value)}
        placeholder={t('Logins or emails, separated by spaces, commas or new lines')}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending || !list.trim()} onClick={() => run('pilot')}>{t('Add to pilot')}</Button>
        <Button size="sm" variant="outline" disabled={pending || !list.trim()} onClick={() => run('control')}>{t('Add to control')}</Button>
        <Button size="sm" variant="ghost" disabled={pending || !list.trim()} onClick={() => run('none')}>{t('Remove from groups')}</Button>
      </div>
      {notice ? <p className={cn('text-sm', notice.ok ? 'text-success' : 'text-destructive')}>{notice.text}</p> : null}
    </div>
  )
}
