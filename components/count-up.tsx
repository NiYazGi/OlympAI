'use client'

import { useLayoutEffect, useRef } from 'react'

/**
 * A number that counts up to its value when it first appears.
 *
 * Kept for results — a paper's score, a round of questions, XP just earned —
 * where the number is the news and a moment of counting lets it land. Nowhere
 * else: a dashboard where every figure spins is a slot machine.
 *
 * The markup always holds the final value, so the server render, a reader
 * with JavaScript off and a screen reader all get the real number. The count
 * writes straight to the text node from an animation frame rather than
 * through state, because sixty renders a second to change one string is work
 * React does not need to do.
 */
export function CountUp({
  value,
  duration = 900,
  delay = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number
  duration?: number
  delay?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  // Layout effect, so the first painted frame already shows the start of the
  // count rather than a flash of the final value.
  useLayoutEffect(() => {
    const node = ref.current
    if (!node || value === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const render = (n: number) => {
      node.textContent = `${prefix}${Math.round(n).toLocaleString('en')}${suffix}`
    }
    render(0)
    let frame = 0
    let started: number | null = null
    const tick = (now: number) => {
      started ??= now + delay
      const t = Math.min(1, Math.max(0, (now - started) / duration))
      // Ease-out cubic: quick at first, settling onto the number.
      render(value * (1 - (1 - t) ** 3))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      render(value)
    }
  }, [value, duration, delay, prefix, suffix])

  return (
    <span ref={ref} className={className}>
      {`${prefix}${value.toLocaleString('en')}${suffix}`}
    </span>
  )
}
