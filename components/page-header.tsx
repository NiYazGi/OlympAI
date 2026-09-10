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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description ? (
          <p className="text-sm text-pretty text-muted-foreground">{description}</p>
        ) : null}
        {note}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  )
}
