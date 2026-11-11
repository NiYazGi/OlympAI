import Link from 'next/link'
import { ArrowRight, ChartNoAxesColumnIncreasing, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { buttonVariants } from '@/components/ui/button'
import { getLocale, getT } from '@/lib/i18n/server'
import { LOCALE_TAGS } from '@/lib/i18n/config'
import { getGlobalRanking, RANKING_LIMIT } from '@/lib/supabase/ranking'
import { cardClass, cn } from '@/lib/utils'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Global ranking') }
}

export default async function RankingPage() {
  const [rows, locale, t] = await Promise.all([getGlobalRanking(), getLocale(), getT()])
  const current = rows.find((row) => row.isCurrentUser)
  const format = new Intl.NumberFormat(LOCALE_TAGS[locale])

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:space-y-6 sm:p-8">
      <PageHeader title={t('Global ranking')} description={t('Compare your results on problems from the shared bank.')} />

      <section aria-label={t('Your place')} className={cn(cardClass, 'flex flex-wrap items-center gap-4 p-4 sm:p-5')}>
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ember text-coral">
          <Trophy aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium">{t('Your place')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {current ? t('{n} rating points', { n: format.format(current.points) }) : t('Submit a solution with a positive score to enter the ranking.')}
          </p>
        </div>
        {current ? (
          <span className="text-2xl font-semibold text-coral tabular-nums">#{format.format(current.place)}</span>
        ) : (
          <Link href="/tasks?list=1" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            {t('View problems')} <ArrowRight aria-hidden />
          </Link>
        )}
      </section>

      <section aria-labelledby="ranking-table-heading" className={cn(cardClass, 'overflow-hidden')}>
        <h2 id="ranking-table-heading" className="flex items-center gap-2 border-b border-border px-4 py-3.5 font-semibold sm:px-5">
          <ChartNoAxesColumnIncreasing aria-hidden className="size-4 text-coral" />
          {t('Top {n}', { n: RANKING_LIMIT })}
        </h2>
        {rows.length ? (
          <table className="w-full table-fixed text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th scope="col" className="w-16 px-4 py-3 text-left text-xs font-medium sm:w-24 sm:px-5">{t('Place')}</th>
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium">{t('Participant')}</th>
                <th scope="col" className="w-28 px-4 py-3 text-right text-xs font-medium sm:w-36 sm:px-5">{t('Rating')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.filter((row) => row.position <= RANKING_LIMIT).map((row) => (
                <tr key={row.position} className={cn('border-t border-border', row.isCurrentUser && 'bg-ember')}>
                  <td className="px-4 py-3 font-medium tabular-nums sm:px-5">{format.format(row.place)}</td>
                  <td className="px-2 py-3 break-words">
                    {row.username ?? t('Participant')}
                    {row.isCurrentUser ? <span className="ml-2 text-xs font-medium text-coral"> {t('You')}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums sm:px-5">{format.format(row.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="px-4 py-5 text-sm text-muted-foreground sm:px-5">{t('No participants have earned rating points yet.')}</p>}
      </section>

      <details className="text-sm text-muted-foreground">
        <summary className="w-fit cursor-pointer font-medium text-foreground">{t('How the rating is calculated')}</summary>
        <p className="mt-2">{t('Each problem contributes 100 × difficulty × (best score ÷ 100)². Your rating is the sum of these points, rounded to two decimal places.')}</p>
        <p className="mt-1">{t('A better score replaces the previous one. Participants with equal ratings share a place.')}</p>
      </details>
    </div>
  )
}
