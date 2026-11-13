'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { endPlan, grantPlan } from '@/app/(app)/admin/users/actions'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import { cardClass, cn, fieldClass } from '@/lib/utils'
import type { AdminResult } from '@/lib/supabase/admin-guard'

type Row = { id: string; planName: string; period: string; source: string; active: boolean; canceled: boolean }

/** Admin → user: what plan they have, and granting or ending one by hand. */
export function PlanControls({ userId, current, rows }: { userId: string; current: string; rows: Row[] }) {
  const t = useT()
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [plan, setPlan] = useState('plus')
  const [days, setDays] = useState('30')

  const run = (action: () => Promise<AdminResult>) =>
    startTransition(async () => {
      const result = await action()
      setNotice(result.ok ? { ok: true, text: result.message ?? '' } : { ok: false, text: result.error ?? t('That did not save. Please try again.') })
    })

  return (
    <section className={cn(cardClass, 'space-y-4 p-5')}>
      <div>
        <h2 className="text-[15px] font-medium text-foreground">{t('Subscription plan')}</h2>
        <p className="mt-0.5 text-sm text-ash">{current}</p>
      </div>

      {rows.length ? (
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className={cn(!row.active && 'text-smoke')}>
                {row.planName} · {row.period} · {t(row.source === 'admin' ? 'granted' : 'bought')}
                {row.canceled ? ` · ${t('not renewed')}` : ''}
              </span>
              {row.active ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => window.confirm(t('End this plan now?')) && run(() => endPlan(userId, row.id))}
                >
                  {t('End now')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-ash">{t('Subscription plan')}</span>
          <select className={cn(fieldClass, 'h-9')} value={plan} onChange={(event) => setPlan(event.target.value)}>
            <option value="plus">Plus</option>
            <option value="unlimit">Unlimit</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ash">{t('Days')}</span>
          <input
            className={cn(fieldClass, 'h-9 w-24')}
            type="number"
            min={1}
            max={730}
            value={days}
            onChange={(event) => setDays(event.target.value)}
          />
        </label>
        <Button size="sm" disabled={pending} onClick={() => run(() => grantPlan(userId, plan, Number(days)))}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t('Grant plan')}
        </Button>
      </div>
      {notice ? <p className={cn('text-sm', notice.ok ? 'text-success' : 'text-destructive')}>{notice.text}</p> : null}
    </section>
  )
}
