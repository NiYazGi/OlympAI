import { cardClass, cn } from '@/lib/utils'

export type Stat = {
  label: string
  value: string
  detail: string
  /** Dim the whole card while there is genuinely nothing behind the number. */
  muted?: boolean
}

/**
 * No default value on purpose: the previous version fell back to a constant
 * array whenever real analytics were missing, so a brand-new account was shown
 * "Current Rating 1840 · +64 this month".
 *
 * The upward arrow that used to sit beside every detail line is gone too. On a
 * fresh account it pointed up next to "Nothing submitted yet".
 */
export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className={cn(cardClass, 'min-w-0 p-4 sm:p-5')}>
          <p className="text-sm text-muted-foreground">{stat.label}</p>
          <p
            className={cn(
              'mt-1 text-2xl font-semibold tracking-tight tabular-nums',
              stat.muted && 'text-muted-foreground/50',
            )}
          >
            {stat.value}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">{stat.detail}</p>
        </div>
      ))}
    </div>
  )
}
