import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * The OlympAI mark: a ring with a folded "A" climbing out of it and a spark at
 * the top right, with navy gradients from the active theme.
 *
 * Gradient ids come from useId so several marks on one page do not collide.
 */
export function BrandGlyph({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  const ring = `${id}-ring`
  const leg = `${id}-leg`
  const fold = `${id}-fold`

  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={cn('size-5 shrink-0', className)}>
      <defs>
        <linearGradient id={ring} x1="12" y1="52" x2="50" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand-highlight)" />
          <stop offset="0.45" stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--brand-highlight)" />
        </linearGradient>
        <linearGradient id={leg} x1="30" y1="18" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand-highlight)" />
          <stop offset="1" stopColor="var(--brand)" />
        </linearGradient>
        <linearGradient id={fold} x1="18" y1="48" x2="34" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--brand-highlight)" />
        </linearGradient>
      </defs>
      {/* Ring, left open at the bottom right where the long leg passes through. */}
      <path
        d="M44.6 46.2A21 21 0 1 1 49 30"
        stroke={`url(#${ring})`}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      {/* Short left leg: the fold that tucks back into the ring. */}
      <path d="M33.5 18 37.4 24.4 25.6 44.6H17.8Z" fill={`url(#${fold})`} />
      {/* Long right leg, running out past the ring. */}
      <path d="M30 18.2c1.4-2.3 4.7-2.3 6.1 0L57 54.6h-8.2L33.5 28.4Z" fill={`url(#${leg})`} />
      {/* Spark. */}
      <path d="M54 4.5 55.6 9 60 10.5 55.6 12 54 16.5 52.4 12 48 10.5 52.4 9Z" fill="var(--brand)" />
    </svg>
  )
}

export function BrandMark({ className, compact = false, large = false }: { className?: string; compact?: boolean; large?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', large && 'gap-2.5', className)}>
      <span className="relative flex">
        <span aria-hidden className="absolute inset-0 rounded-full bg-coral/10 blur-md" />
        <BrandGlyph className={cn('relative size-6', large && 'size-8')} />
      </span>
      {compact ? null : (
        <span className={cn('text-[15px] font-semibold tracking-[0.01em] text-foreground', large && 'text-2xl font-bold tracking-tight')}>
          Olymp<span className="text-coral">AI</span>
        </span>
      )}
    </span>
  )
}

/**
 * Sulu's face, from the same sheet as the logo: a rounded robot head with an
 * antenna and a smile. Used wherever the coach itself is speaking.
 */
export function SuluGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn('size-5 shrink-0', className)}>
      <path d="M12 3.2v2.6" stroke="var(--brand)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="2.8" r="1.5" fill="var(--brand)" />
      <rect x="2" y="9.6" width="2.2" height="5.6" rx="1.1" fill="var(--brand)" />
      <rect x="19.8" y="9.6" width="2.2" height="5.6" rx="1.1" fill="var(--brand)" />
      <rect x="3.6" y="6" width="16.8" height="13.6" rx="5.4" fill="var(--brand)" />
      <rect x="5.6" y="8" width="12.8" height="9.6" rx="3.8" fill="#000" />
      <path
        d="M8.2 12.2c.5-.7 1.5-.7 2 0M13.8 12.2c.5-.7 1.5-.7 2 0M10.2 14.6c1 .8 2.6.8 3.6 0"
        stroke="var(--brand-highlight)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}
