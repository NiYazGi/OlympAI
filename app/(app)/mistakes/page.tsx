import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, CircleDashed, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { MistakeReviewForm } from '@/components/mistakes/review-form'
import { listMistakes, recurrence, type MistakeEntry } from '@/lib/mistakes'
import { getTaskCatalogue } from '@/lib/supabase/queries'
import { getSessionUserId } from '@/lib/supabase/auth'
import { shortDate } from '@/lib/admin/format'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Mistake log') }
}

const REASON_LABEL: Record<string, string> = {
  knowledge: 'Did not know the fact or formula',
  method: 'Chose the wrong method',
  calculation: 'Calculation or algebra slip',
  presentation: 'Right idea, missing justification',
  reading: 'Misread the statement',
  time: 'Ran out of time',
  other: 'Something else',
}

export default async function MistakesPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect('/login?next=/mistakes')
  const [t, locale, entries, catalogue] = await Promise.all([getT(), getLocale(), listMistakes(userId), getTaskCatalogue()])
  const byId = new Map(catalogue.map((task) => [task.id, task]))
  const open = entries.filter((entry) => entry.status === 'open')
  const retest = entries.filter((entry) => entry.status === 'retest')
  const fixed = entries.filter((entry) => entry.status === 'fixed')
  const repeat = recurrence(entries, (id) => byId.get(id)?.topic)
  const reasons = Object.entries(
    entries.reduce<Record<string, number>>((acc, entry) => (entry.reason ? { ...acc, [entry.reason]: (acc[entry.reason] ?? 0) + 1 } : acc), {}),
  ).sort((a, b) => b[1] - a[1])

  const title = (entry: MistakeEntry) => byId.get(entry.taskId)?.title ?? entry.taskId

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={t('Mistake log')}
        description={t('Every problem that lost points. Write down why, then solve a new similar problem without hints: only that closes the mistake.')}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t('To review'), value: open.length },
          { label: t('Check problem waiting'), value: retest.length },
          { label: t('Fixed'), value: fixed.length },
          { label: t('Repeat in the same topic'), value: repeat === null ? '—' : `${repeat}%` },
        ].map((stat) => (
          <div key={stat.label} className={cn(cardClass, 'p-4')}>
            <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
      {reasons.length ? (
        <p className="-mt-2 text-sm text-muted-foreground">
          {t('Most common causes')}: {reasons.slice(0, 3).map(([reason, n]) => `${t(REASON_LABEL[reason] ?? reason)} (${n})`).join(' · ')}
        </p>
      ) : null}

      {!entries.length ? (
        <p className={cn(cardClass, 'p-5 text-sm text-muted-foreground')}>{t('No mistakes logged yet. They appear here by themselves after a solution or a paper loses points.')}</p>
      ) : null}

      {open.length ? (
        <section className="space-y-3">
          <h2 className="eyebrow flex items-center gap-2"><CircleDashed className="size-3.5" /> {t('To review')}</h2>
          {open.map((entry) => (
            <article key={entry.id} className={cn(cardClass, 'p-4 sm:p-5')}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link href={entry.attemptId ? `/tasks/${entry.taskId}/attempts/${entry.attemptId}` : `/tasks/${entry.taskId}`} className="font-medium hover:text-primary hover:underline">{title(entry)}</Link>
                <span className="text-xs text-muted-foreground">{entry.points !== null ? `${entry.points}/7 · ` : ''}{shortDate(entry.createdAt, locale)}</span>
              </div>
              {entry.breakNeed ? <p className="mt-2 text-sm text-muted-foreground">{t('Where it broke')}: {entry.breakNeed}</p> : null}
              <MistakeReviewForm entryId={entry.id} />
            </article>
          ))}
        </section>
      ) : null}

      {retest.length ? (
        <section className="space-y-3">
          <h2 className="eyebrow flex items-center gap-2"><RotateCcw className="size-3.5" /> {t('Check: a new problem, no hints')}</h2>
          {retest.map((entry) => (
            <article key={entry.id} className={cn(cardClass, 'p-4 sm:p-5')}>
              <p className="text-sm text-muted-foreground">{t('Mistake')}: {title(entry)}{entry.reason ? ` · ${t(REASON_LABEL[entry.reason])}` : ''}</p>
              {entry.note ? <p className="mt-1 text-sm italic">«{entry.note}»</p> : null}
              {entry.retestTaskId ? (
                <Link href={`/tasks/${entry.retestTaskId}`} className="mt-3 inline-block rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
                  {t('Solve the check problem')}: {byId.get(entry.retestTaskId)?.title ?? entry.retestTaskId}
                </Link>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{t('No similar unsolved problem is left in this topic. Re-solve the original from a blank page without hints.')}</p>
              )}
              {entry.retestTries > 0 ? <p className="mt-2 text-xs text-muted-foreground">{t('Attempts at a check problem: {n}. A check counts only when solved without hints or Sulu.', { n: entry.retestTries })}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      {fixed.length ? (
        <section className="space-y-2">
          <h2 className="eyebrow flex items-center gap-2"><CheckCircle2 className="size-3.5 text-success" /> {t('Fixed')}</h2>
          <ul className={cn(cardClass, 'divide-y divide-border text-sm')}>
            {fixed.map((entry) => (
              <li key={entry.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                <span>{title(entry)}</span>
                <span className="text-xs text-muted-foreground">{entry.fixedAt ? shortDate(entry.fixedAt, locale) : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
