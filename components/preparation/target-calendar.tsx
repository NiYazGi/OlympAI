'use client'

import { useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocale, useT } from '@/components/i18n-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatDay, LOCALE_TAGS } from '@/lib/i18n/config'

export function TargetCalendar({ targetDate }: { targetDate: string }) {
  const t = useT()
  const locale = useLocale()
  const [monthOffset, setMonthOffset] = useState(0)
  const target = new Date(`${targetDate}T00:00:00Z`)
  const month = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + monthOffset, 1))
  const monthLabel = new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(month)
  const weekday = new Intl.DateTimeFormat(LOCALE_TAGS[locale], { weekday: 'short', timeZone: 'UTC' })
  const monthStart = (month.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate()
  const weeks = Math.ceil((monthStart + daysInMonth) / 7)

  return (
    <Popover.Root onOpenChange={(open) => { if (open) setMonthOffset(0) }}>
      <Popover.Trigger
        aria-label={`${t('Olympiad date')} · ${formatDay(targetDate, locale)}`}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        <CalendarDays aria-hidden /> <span className="tabular-nums">{target.getUTCDate()}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="end" sideOffset={8} className="z-40">
          <Popover.Popup className="motion-popover w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-pop">
            <Popover.Title className="px-1 text-xs font-medium text-muted-foreground">{t('Olympiad date')}</Popover.Title>
            <div className="my-2 flex items-center justify-between gap-1">
              <Button size="icon-sm" variant="ghost" aria-label={t('Previous month')} onClick={() => setMonthOffset((offset) => offset - 1)}>
                <ChevronLeft aria-hidden />
              </Button>
              <span aria-live="polite" className="text-sm font-medium first-letter:uppercase">{monthLabel}</span>
              <Button size="icon-sm" variant="ghost" aria-label={t('Next month')} onClick={() => setMonthOffset((offset) => offset + 1)}>
                <ChevronRight aria-hidden />
              </Button>
            </div>
            <table aria-label={monthLabel} className="w-full table-fixed text-center text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  {Array.from({ length: 7 }, (_, index) => (
                    <th key={index} scope="col" className="pb-2 font-medium">
                      {weekday.format(new Date(Date.UTC(2024, 0, index + 1)))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: weeks }, (_, week) => (
                  <tr key={week}>
                    {Array.from({ length: 7 }, (_, index) => {
                      const day = week * 7 + index - monthStart + 1
                      const highlighted = monthOffset === 0 && day === target.getUTCDate()
                      return (
                        <td key={index} className="h-8">
                          {highlighted ? (
                            <span className="mx-auto grid size-7 place-items-center rounded-full bg-coral font-semibold text-[var(--brand-contrast)]">
                              {day}<span className="sr-only"> · {t('Olympiad date')}</span>
                            </span>
                          ) : day >= 1 && day <= daysInMonth ? day : null}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {monthOffset !== 0 ? (
              <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => setMonthOffset(0)}>
                {t('Back to olympiad date')}
              </Button>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
