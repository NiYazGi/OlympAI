import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { Locked } from '@/components/billing/locked'
import { PrintButton } from '@/components/print-button'
import { billingEnabled } from '@/lib/billing'
import { canUse } from '@/lib/features'
import { getWeeklyReport } from '@/lib/insights'
import { formatDate } from '@/lib/i18n/config'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Weekly readiness report') }
}

export default async function ReportPage() {
  if (!billingEnabled()) notFound()
  const t = await getT()
  const open = await canUse('weeklyReport')
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <BackLink href="/me">{t('Me')}</BackLink>
      <PageHeader title={t('Weekly readiness report')} description={t('The last seven days: what was done, where you stand against the target, and what to do next.')}>
        {open ? <PrintButton /> : null}
      </PageHeader>
      {open ? <Report /> : <Locked feature="weeklyReport" />}
    </div>
  )
}

async function Report() {
  const [t, locale, report] = await Promise.all([getT(), getLocale(), getWeeklyReport()])
  const day = (value: string) => formatDate(new Date(value), locale, { day: 'numeric', month: 'long' })
  const delta = report.accuracy !== null && report.previousAccuracy !== null ? report.accuracy - report.previousAccuracy : null
  const stats = [
    { label: t('Attempts'), value: String(report.attempts) },
    { label: t('Problems solved'), value: String(report.solved) },
    { label: t('Accuracy'), value: report.accuracy === null ? '—' : `${report.accuracy}%`, note: delta === null ? null : `${delta >= 0 ? '+' : ''}${delta} ${t('vs the week before')}` },
    { label: t('Active days'), value: `${report.activeDays} / 7` },
  ]
  return (
    <>
      <p className="-mt-2 text-sm text-muted-foreground">{day(report.from)} — {day(report.to)}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={cn(cardClass, 'p-4')}>
            <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
            {stat.note ? <p className="mt-1 text-[11px] text-muted-foreground">{stat.note}</p> : null}
          </div>
        ))}
      </div>

      <section className={cn(cardClass, 'flex flex-wrap items-center gap-5 p-5 sm:p-6')}>
        <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-coral/70 text-xl font-semibold tabular-nums">
          {report.readiness === null ? '—' : `${report.readiness}%`}
        </div>
        <div className="min-w-0">
          <h2 className="font-medium">{t('Readiness')}{report.target ? ` · ${t(report.target)}` : ''}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('Share of the topics in good shape: strong counts in full, developing by half.')}
            {report.daysLeft !== null ? ` ${t('{n} {n|day|days} to go.', { n: report.daysLeft })}` : ''}
          </p>
        </div>
      </section>

      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <h2 className="font-medium">{t('Recommendations')}</h2>
        <ol className="mt-3 space-y-2.5 text-sm">
          {report.recommendations.map((item, index) => {
            const vars = item.vars ? Object.fromEntries(Object.entries(item.vars).map(([key, value]) => [key, typeof value === 'string' ? t(value) : value])) : undefined
            return (
              <li key={index} className="flex gap-2.5">
                <span className="font-mono text-xs leading-5 text-muted-foreground">{index + 1}.</span>
                <span>
                  {t(item.text, vars)}
                  {item.href ? (
                    <Link href={item.href} className="ml-1.5 inline-flex items-center gap-0.5 text-primary hover:underline">
                      {t('Open')} <ArrowRight className="size-3" />
                    </Link>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className={cn(cardClass, 'p-5')}>
          <h2 className="font-medium">{t('Topics this week')}</h2>
          {report.topics.length ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {report.topics.map((row) => (
                <li key={row.topic} className="flex justify-between gap-3">
                  <span>{t(row.topic)}</span>
                  <span className="text-muted-foreground tabular-nums">{row.correct}/{row.attempts}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t('No attempts this week.')}</p>
          )}
        </section>
        <section className={cn(cardClass, 'p-5')}>
          <h2 className="font-medium">{t('Still to fix')}</h2>
          {report.mistakes.length ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {report.mistakes.map((task) => (
                <li key={task.id}>
                  <Link href={`/tasks/${task.id}`} className="hover:text-primary hover:underline">{task.title}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t('Nothing left unsolved from this week.')}</p>
          )}
        </section>
      </div>
    </>
  )
}
