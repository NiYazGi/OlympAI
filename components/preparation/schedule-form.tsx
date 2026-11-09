'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { savePreparationPreferences } from '@/app/(app)/plan/actions'
import { useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PreparationPreferences } from '@/lib/preparation'
import { cardClass, cn } from '@/lib/utils'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function PreparationSchedule({ preferences, custom, grade, intensity }: {
  preferences: PreparationPreferences
  custom: boolean
  grade: number | string | null
  intensity: string | null
}) {
  const t = useT()
  const [result, save, pending] = useActionState(savePreparationPreferences, null)

  return (
    <section id="schedule" className={cn(cardClass, 'p-5 sm:p-6')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">{t('Study schedule')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('Choose when you can study and how long each session can be.')}
          </p>
          {intensity ? <p className="mt-1 text-xs text-muted-foreground">{t('Profile rhythm')} · {t(intensity)}</p> : null}
        </div>
        <Link href="/me" className="text-sm text-muted-foreground underline underline-offset-2">{t('Profile preferences')}</Link>
      </div>
      <form action={save} className="mt-5 space-y-4">
        <fieldset disabled={pending}>
          <legend className="text-sm font-medium">{t('Study days')}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((name, index) => {
              const value = (index + 1) % 7
              return (
                <label key={name} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs has-checked:border-primary has-checked:bg-secondary">
                  <input className="accent-primary" type="checkbox" name="weekday" value={value} defaultChecked={preferences.weekdays.includes(value)} />
                  {t(name)}
                </label>
              )
            })}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            {t('Minutes per session')}
            <Input name="minutes" type="number" min={15} max={360} step={1} required defaultValue={preferences.sessionMinutes} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            {t('School class')}
            <select name="school_grade" defaultValue={preferences.schoolGrade ?? ''} className="h-9 rounded-lg border border-input bg-card px-3 text-sm">
              <option value="">{t('Use profile class')}{typeof grade === 'string' ? ` · ${t(grade)}` : ''}</option>
              {Array.from({ length: 7 }, (_, index) => index + 6).map((value) => (
                <option key={value} value={value}>{t('Grade {n}', { n: value })}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={pending}>{t('Update program')}</Button>
          {custom ? <Button type="submit" variant="ghost" name="mode" value="default" formNoValidate disabled={pending}>{t('Use profile rhythm')}</Button> : null}
          {result?.ok ? <span role="status" className="text-sm text-success">{t('Program updated')}</span> : null}
          {result?.error ? <p role="alert" className="text-sm text-destructive">{result.error}</p> : null}
        </div>
      </form>
    </section>
  )
}
