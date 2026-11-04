import type { ReactNode } from 'react'

/**
 * `note` is a slot rather than a second string: on pages whose data streams in,
 * the heading renders immediately while the detail that belongs beside it —
 * "built from 12 attempts", "current level" — arrives later. Both pages that
 * needed this were pasting a paragraph underneath with a negative margin.
 */
export function PageHeader({
  title,
  description,
  note,
  children,
}: {
  title: ReactNode
  description?: string
  note?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        <h1 className="text-[28px] leading-[1.15] font-normal text-balance break-words text-white sm:text-[32px]">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-[15px] text-pretty text-ash">{description}</p>
        ) : null}
        {note}
      </div>
      {/* min-w-0 so a long badge wraps instead of widening the page on a phone. */}
      {children ? <div className="flex min-w-0 items-center gap-2">{children}</div> : null}
    </div>
  )
}
