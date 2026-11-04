import Link from 'next/link'
import { CalendarCheck } from 'lucide-react'
import { cardClass, cn } from '@/lib/utils'
import type { ProgressAnalytics } from '@/lib/types'
import { getT } from '@/lib/i18n/server'

const INTENSITY_SESSIONS: Record<string, number> = {
  '3 short sessions a week': 3,
  '5 focused sessions a week': 5,
  'Daily intensive practice': 7,
}

/**
 * The weekly rhythm, folded into the path.
 *
 * It used to be a page of its own alongside this one, which meant two screens
 * answering "what should I do next" with different answers. The path decides
 * what; this only says how often, and how the current week is going.
 */
export async function WeekRhythm({
  analytics,
  intensity,
}: {
  analytics: ProgressAnalytics
  intensity: string | null
}) {
  const t = await getT()

  const target = INTENSITY_SESSIONS[intensity ?? ''] ?? 4
  const active = analytics.recentActivity.filter((day) => day.problems > 0).length
  const week =
    analytics.recentActivity.length > 0
      ? analytics.recentActivity
      : Array.from({ length: 7 }, (_, index) => ({ day: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]!, problems: 0 }))

  return (
    <section className={cn(cardClass, 'p-5')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-medium">
          <CalendarCheck className="size-4 text-primary" />
          {t('This week')}
        </h2>
        <span className="text-sm tabular-nums text-muted-foreground">
          {active}/{target} {t('sessions')}
        </span>
      </div>

      <div className="mt-4 flex gap-1.5">
        {week.map((day, index) => (
          <div key={`${day.day}-${index}`} className="flex-1 text-center">
            <div
              title={t('{n} {n|attempt|attempts}', { n: day.problems })}
              className={cn(
                'h-8 rounded-md',
                day.problems > 0
                  ? 'bg-primary'
                  : 'border border-dashed border-border bg-transparent',
              )}
            />
            <span className="mt-1 block text-[10px] text-muted-foreground">
              {day.day.slice(0, 1)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {active >= target
          ? t('Target met for this week.')
          : t('{n} more sessions to hit your rhythm.', { n: target - active })}{' '}
        <Link href="/me" prefetch className="text-primary hover:underline">
          {t('Change it')}
        </Link>
      </p>
    </section>
  )
}
