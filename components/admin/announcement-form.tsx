'use client'

import { useState, useTransition } from 'react'
import { Loader2, Megaphone } from 'lucide-react'
import { saveAnnouncement } from '@/app/(app)/admin/site/actions'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import { cn, fieldClass } from '@/lib/utils'
import type { Announcement } from '@/lib/admin/settings'

export function AnnouncementForm({ current }: { current: Announcement | null }) {
  const t = useT()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await saveAnnouncement(formData)
          setNotice({ ok: result.ok, text: (result.ok ? result.message : result.error) ?? '' })
        })
      }
      className="space-y-3"
    >
      <textarea
        name="text"
        defaultValue={current?.text ?? ''}
        maxLength={500}
        rows={3}
        placeholder={t('For example: the grader is being updated tonight from 22:00 to 23:00.')}
        className={cn(fieldClass, 'h-auto py-2.5')}
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm text-ash">
          {t('Tone')}
          <select name="tone" defaultValue={current?.tone ?? 'info'} className={cn(fieldClass, 'mt-1.5 h-10')}>
            <option value="info">{t('Information')}</option>
            <option value="warning">{t('Warning')}</option>
          </select>
        </label>
        <label className="block text-sm text-ash">
          {t('Show until')}
          <input type="date" name="until" defaultValue={current?.until ?? ''} className={cn(fieldClass, 'mt-1.5 h-10')} />
        </label>
      </div>
      <p className="text-[11px] text-smoke">{t('Shown at the top of the app to everyone signed in. Leave the text empty to clear it.')}</p>
      {notice?.text ? <p className={cn('text-sm', notice.ok ? 'text-success' : 'text-coral')}>{notice.text}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />}
        {t('Save banner')}
      </Button>
    </form>
  )
}
