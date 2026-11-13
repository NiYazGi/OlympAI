import { notFound } from 'next/navigation'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { Locked } from '@/components/billing/locked'
import { billingEnabled } from '@/lib/billing'
import { canUse } from '@/lib/features'
import { getSkillMap, type SkillState } from '@/lib/insights'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Skills and gaps map') }
}

const STATE: Record<SkillState, { label: string; tone: string; dot: string }> = {
  strong: { label: 'Strong', tone: 'text-success', dot: 'bg-success' },
  developing: { label: 'Developing', tone: 'text-foreground', dot: 'bg-warning' },
  gap: { label: 'Gap', tone: 'text-destructive', dot: 'bg-destructive' },
  untouched: { label: 'Not started', tone: 'text-muted-foreground', dot: 'bg-foreground/20' },
}

export default async function SkillsPage() {
  // A plans feature: only where plans are switched on.
  if (!billingEnabled()) notFound()
  const t = await getT()
  const open = await canUse('skillMap')
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <BackLink href="/me">{t('Me')}</BackLink>
      <PageHeader title={t('Skills and gaps map')} description={t('Every topic of your subject: what holds, what is shaky, what is missing, from your own graded attempts.')} />
      {open ? <SkillMap /> : <Locked feature="skillMap" />}
    </div>
  )
}

async function SkillMap() {
  const [t, map] = await Promise.all([getT(), getSkillMap()])
  const counts = map.rows.reduce<Record<SkillState, number>>((acc, row) => ({ ...acc, [row.state]: acc[row.state] + 1 }), { strong: 0, developing: 0, gap: 0, untouched: 0 })
  const subjects = [...new Set(map.rows.map((row) => row.subject))]
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(STATE) as SkillState[]).map((state) => (
          <div key={state} className={cn(cardClass, 'p-4')}>
            <p className={cn('text-2xl font-semibold tabular-nums', STATE[state].tone)}>{counts[state]}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('size-2 rounded-full', STATE[state].dot)} /> {t(STATE[state].label)}
            </p>
          </div>
        ))}
      </div>
      {subjects.map((subject) => (
        <section key={subject} className={cn(cardClass, 'p-5 sm:p-6')}>
          <h2 className="font-medium">{t(subject)}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {map.rows.filter((row) => row.subject === subject).map((row) => (
              <li key={row.topic} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{t(row.topic)}</span>
                  <span className={cn('flex shrink-0 items-center gap-1.5 text-xs font-medium', STATE[row.state].tone)}>
                    <span className={cn('size-2 rounded-full', STATE[row.state].dot)} /> {t(STATE[row.state].label)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                  <div className={cn('h-full rounded-full', STATE[row.state].dot)} style={{ width: `${row.tasks ? Math.max(3, (row.solved / row.tasks) * 100) : 0}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                  {t('{solved} of {tasks} solved', { solved: row.solved, tasks: row.tasks })}
                  {row.accuracy !== null ? ` · ${t('accuracy {n}%', { n: row.accuracy })}` : ''}
                  {row.averageScore !== null ? ` · ${t('average score {n}', { n: row.averageScore })}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
