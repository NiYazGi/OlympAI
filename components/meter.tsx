import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * A bar that says how far along something is.
 *
 * Every progress bar in the app used to be its own pair of divs with its own
 * transition, and each one simply appeared at its final length. Here the fill
 * grows from empty the first time the bar is seen (`.meter-fill` in
 * app/globals.css), so the eye lands on the one thing the bar is for, and a
 * later change of value slides instead of jumping.
 *
 * Without `label` it is decoration next to a number that already says the same
 * thing, and is hidden from assistive technology rather than read twice.
 */
export function Meter({
  value,
  className,
  barClassName,
  label,
}: {
  /** 0–100. */
  value: number
  /** The track: height and background. */
  className?: string
  /** The fill: colour. */
  barClassName?: string
  label?: string
}) {
  // Clamped, and a non-number is treated as nought: this is the last step
  // before a CSS width, where NaN is not an error but a rule the browser drops
  // on the floor — a bar that is silently empty for a reason nobody can see.
  const percent = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0

  return (
    <div
      className={cn('h-1.5 overflow-hidden bg-muted', className)}
      {...(label
        ? {
            role: 'progressbar',
            'aria-label': label,
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuenow': Math.round(percent),
          }
        : { 'aria-hidden': true })}
    >
      <div
        className={cn('meter-fill h-full bg-primary', barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

/** Circumference of the r=52 circle the progress rings are drawn on. */
export const RING_LENGTH = 2 * Math.PI * 52

/** Style for a ring's arc: its circumference, so `.ring-fill` can start empty. */
export function ringStyle() {
  // px in an SVG is a user unit, so this is the circumference in the viewBox's
  // own coordinates.
  return { '--ring-length': `${RING_LENGTH}px` } as CSSProperties
}
