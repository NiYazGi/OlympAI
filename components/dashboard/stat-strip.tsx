import { Flame } from 'lucide-react'
import { Meter } from '@/components/meter'
import { getFlame } from '@/lib/supabase/visits'
import { getT } from '@/lib/i18n'
import { cn, labelClass } from '@/lib/utils'
import type { ProgressAnalytics } from '@/lib/types'

/**
 * Four figures in a row: today, level, streak, and the distance to the target.
 *
 * This replaces a card the size of a screen that held the same four numbers
 * plus three sentences explaining them — where XP comes from, what a streak is
 * for, what to do next. Every one of those sentences was true and none of them
 * was news after the first week, so they have gone to /method, which is the
 * page for rules, and the numbers stayed here, which is the page for today.
 */
export async function StatStrip({
  analytics,
  target,
}: {
  analytics: ProgressAnalytics
  /** The competition and how far off it is, when one has been chosen. */
  target: { name: string; daysLeft: number } | null
}) {
  const [t, flame] = await Promise.all([getT(), getFlame()])
  const { xp, activeStreak } = analytics

  return (
    // One ruled strip rather than four floating tiles: the cells share their
    // rules, the way the columns of a table do.
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-border ring-1 ring-border lg:grid-cols-4">
      <Tile label={t.dashboard.today} value={String(xp.today)} unit={`/ ${xp.goal} XP`}>
        <Meter
          value={xp.goal > 0 ? (xp.today / xp.goal) * 100 : 0}
          className="mt-3 h-1"
          barClassName={xp.today >= xp.goal ? 'bg-success' : undefined}
        />
      </Tile>

      <Tile label={t.dashboard.level} value={String(xp.level)} unit={`${xp.intoLevel}/${xp.levelSpan}`}>
        <Meter value={xp.levelPercent} className="mt-3 h-1" />
      </Tile>

      {/* The flame, the same one as in the header: days in a row the app was
          opened, with the last seven days marked underneath. */}
      <Tile
        label={t.dashboard.streak}
        value={String(activeStreak)}
        unit={t.dashboard.dayUnit(activeStreak)}
        icon={
          <Flame
            className={cn(
              'size-4',
              flame.lit ? 'fill-chrome text-warning' : 'text-muted-foreground',
            )}
          />
        }
      >
        <div className="mt-3 flex gap-1">
          {(flame.week.length ? flame.week : Array.from({ length: 7 }, (_, i) => ({ day: `d${i}`, visited: false }))).map(
            (day) => (
              <span
                key={day.day}
                title={day.day}
                className={cn('h-1 flex-1', day.visited ? 'bg-chrome' : 'bg-foreground/10')}
              />
            ),
          )}
        </div>
      </Tile>

      <Tile
        label={t.dashboard.target}
        value={target ? String(target.daysLeft) : '—'}
        unit={target ? t.dashboard.daysLeftUnit : t.dashboard.targetUnset}
      >
        <p className="mt-3 truncate text-xs text-muted-foreground">
          {target ? target.name : t.dashboard.targetPick}
        </p>
      </Tile>
    </div>
  )
}

function Tile({
  label,
  value,
  unit,
  icon,
  children,
}: {
  label: string
  value: string
  unit: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-card p-4">
      <p className={cn(labelClass, 'flex items-center gap-1.5')}>
        {icon}
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="font-figure text-[2rem] leading-none font-extrabold tabular-nums">
          {value}
        </span>
        <span className="truncate text-caption font-semibold text-muted-foreground">{unit}</span>
      </p>
      {children}
    </div>
  )
}
