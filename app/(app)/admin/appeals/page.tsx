import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { appealStats } from '@/lib/appeals'
import { shortDate } from '@/lib/admin/format'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Appeals · Admin') }
}

/**
 * Grading quality as students see it: how often a real dispute changes the AI
 * mark. A rising share of upheld disputes is the signal to look at the grader
 * prompt or the scheme of a particular problem.
 */
export default async function AdminAppealsPage() {
  const [t, locale, stats] = await Promise.all([getT(), getLocale(), appealStats()])
  const dispute = stats.byMode.find((row) => row.mode === 'dispute')
  const practice = stats.byMode.find((row) => row.mode === 'practice')
  const changed = dispute ? dispute.upheld + dispute.partial : 0
  const cards = [
    { label: t('Disputes'), value: String(dispute?.total ?? 0) },
    { label: t('Mark changed'), value: dispute?.total ? `${Math.round((changed / dispute.total) * 100)}%` : '—' },
    { label: t('Average rise, points'), value: dispute?.avg_gain ? dispute.avg_gain.toFixed(1) : '—' },
    { label: t('Trainer appeals'), value: String(practice?.total ?? 0) },
  ]
  return (
    <div className="space-y-6">
      <PageHeader title={t('Appeals')} description={t('How often a student’s dispute changes the AI mark. Disputes that win point to grading worth checking.')} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className={cn(cardClass, 'p-4')}>
            <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>
      <section className={cn(cardClass, 'overflow-hidden')}>
        {stats.recent.length ? (
          <ul className="divide-y divide-border text-sm">
            {stats.recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={`/tasks/${row.task_id}`} className="font-medium hover:underline">{row.title}</Link>
                  <p className="mt-0.5 line-clamp-2 text-muted-foreground">{row.argument}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <p>{row.mode === 'dispute' ? t('dispute') : t('trainer')} · {row.verdict ? t(row.verdict === 'partial' ? 'partly upheld' : row.verdict) : '—'}</p>
                  <p className="tabular-nums">{row.points_before ?? '—'} → {row.points_after ?? '—'} / 7</p>
                  <p>{row.username ? `@${row.username} · ` : ''}{shortDate(row.created_at, locale)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-sm text-muted-foreground">{t('No appeals yet.')}</p>
        )}
      </section>
    </div>
  )
}
