import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A key, as a hint beside the control it drives. Hidden on touch screens,
 * where there is no keyboard to press it on.
 */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-current/20 px-1 font-sans text-[11px] leading-none font-medium opacity-70 pointer-coarse:hidden',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
