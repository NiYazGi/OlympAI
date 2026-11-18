import { DayCard } from '@/components/day/day-card'
import { DAY_MAX } from '@/lib/day-state'
import { getDayStatus } from '@/lib/supabase/day'
import { getT } from '@/lib/i18n/server'

/**
 * The 25-point day under today's session, folded so the home page stays one
 * goal, one session and one button. Each of the five axes is shown on open:
 * the total alone can hide an axis at zero.
 */
export async function DaySummary() {
  const [t, status] = await Promise.all([getT(), getDayStatus()])
  const weakest = status.recorded ? [...status.score.axes].sort((a, b) => a.score - b.score)[0] : null
  return (
    <details className="group mx-auto max-w-4xl" open={!status.recorded ? undefined : (weakest?.score ?? 5) <= 1}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-3 text-sm [&::-webkit-details-marker]:hidden">
        <span className="font-medium">
          {t('My day')}: {status.recorded ? `${status.score.total} / ${DAY_MAX}` : t('not filled in yet')}
        </span>
        <span className="flex items-center gap-1" aria-hidden>
          {status.score.axes.map((axis) => (
            <span key={axis.key} title={`${axis.label}: ${axis.score}/5`} className="flex items-end gap-px">
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} className={index < axis.score ? 'h-2.5 w-1 rounded-[1px] bg-primary' : 'h-2.5 w-1 rounded-[1px] bg-foreground/10'} />
              ))}
              <span className="w-1.5" />
            </span>
          ))}
        </span>
      </summary>
      <div className="mt-3">
        <DayCard status={status} />
      </div>
    </details>
  )
}
