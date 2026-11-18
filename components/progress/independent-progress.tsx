import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { independentProgress } from '@/lib/independent-progress'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

/** The main measures of progress, ahead of XP: what the student can now do alone. */
export async function IndependentProgressCard({ userId }: { userId: string }) {
  const [t, data] = await Promise.all([getT(), independentProgress(userId)])
  const delta = data.independentRate !== null && data.previousRate !== null ? data.independentRate - data.previousRate : null
  const lastPaper = data.papers.at(-1)
  const prevPaper = data.papers.at(-2)
  const stats = [
    {
      label: t('New problems solved alone, first try'),
      value: data.independentRate === null ? '—' : `${data.independentRate}%`,
      note: data.firstTries ? t('{a} of {b} in 30 days', { a: data.independentSolved, b: data.firstTries }) : t('No new problems in 30 days'),
      delta,
    },
    {
      label: t('Last mock paper'),
      value: lastPaper ? `${lastPaper.score}%` : '—',
      note: prevPaper ? t('before that: {n}%', { n: prevPaper.score }) : t('Timed papers, no hints'),
      delta: lastPaper && prevPaper ? lastPaper.score - prevPaper.score : null,
    },
    {
      label: t('Mistakes that repeat'),
      value: data.repeatRate === null ? '—' : `${data.repeatRate}%`,
      note: t('{fixed} fixed · {open} open', { fixed: data.fixedMistakes, open: data.openMistakes }),
      delta: null,
      lowerIsBetter: true,
    },
    {
      label: t('Time this week'),
      value: `${Math.round(data.minutesLastWeek / 6) / 10} ${t('h')}`,
      note: data.minutesPerSolved ? t('≈ {n} min per problem solved alone', { n: data.minutesPerSolved }) : t('Finished planned sessions'),
      delta: null,
    },
  ]
  return (
    <section className={cn(cardClass, 'p-5 sm:p-6')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">{t('Independent progress')}</h2>
        <Link href="/mistakes" className="text-sm text-primary hover:underline">{t('Mistake log')} →</Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('What counts: new problems and papers without hints, mistakes that do not come back, and the time it took. XP is a bonus.')}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border p-3">
            <p className="flex items-center gap-1 text-2xl font-semibold tabular-nums">
              {stat.value}
              {stat.delta ? (
                stat.delta > 0 ? <ArrowUpRight className="size-4 text-success" aria-label={t('up')} /> : <ArrowDownRight className="size-4 text-destructive" aria-label={t('down')} />
              ) : null}
            </p>
            <p className="mt-0.5 text-xs font-medium">{stat.label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{stat.note}</p>
          </div>
        ))}
      </div>
      {data.helpedShare !== null && data.helpedShare >= 50 ? (
        <p className="mt-3 text-xs text-muted-foreground">{t('{n}% of new problems this month were opened with a hint or Sulu first. Try the first ten minutes alone.', { n: data.helpedShare })}</p>
      ) : null}
    </section>
  )
}
