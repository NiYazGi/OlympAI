'use client'

import Link from 'next/link'
import { Popover } from '@base-ui/react/popover'
import { useLocale, useT } from '@/components/i18n-provider'
import { formatDay } from '@/lib/i18n/config'
import type { PreparationStep } from '@/lib/preparation'

export function RouteProgress({ steps }: { steps: PreparationStep[] }) {
  const t = useT()
  const locale = useLocale()
  const done = steps.filter((step) => step.completedAt)
  return <Popover.Root>
    <Popover.Trigger aria-label={`${t('{completed} of {total} steps completed', { completed: done.length, total: steps.length })}. Показать объяснение`} className="rounded-lg text-3xl font-bold tracking-tight tabular-nums outline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">
      {done.length}<span className="text-muted-foreground">/{steps.length}</span>
    </Popover.Trigger>
    <Popover.Portal><Popover.Positioner align="end" sideOffset={10} className="z-40"><Popover.Popup className="motion-popover w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-pop">
      <Popover.Title className="text-sm font-semibold">Действия маршрута</Popover.Title>
      <Popover.Description className="mt-2 text-xs leading-relaxed text-muted-foreground">Завершённые шаги персонального плана. Это выполнение программы, а не процент освоения навыков или балл пробника.</Popover.Description>
      {done.length ? <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">{done.map((step) => <li key={step.id} className="border-t border-border pt-2">{step.href ? <Link href={step.href} className="hover:underline">{step.title}</Link> : step.title}<p className="mt-1 text-xs text-muted-foreground">{formatDay(step.completedAt!.slice(0, 10), locale)}</p></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">Завершённых шагов пока нет.</p>}
    </Popover.Popup></Popover.Positioner></Popover.Portal>
  </Popover.Root>
}
