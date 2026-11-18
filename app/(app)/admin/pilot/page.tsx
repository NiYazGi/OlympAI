import { PageHeader } from '@/components/page-header'
import { PilotForm } from '@/components/admin/pilot-form'
import { cohortComparison, cohortMembers, type WindowMetrics } from '@/lib/pilot'
import { shortDate } from '@/lib/admin/format'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Pilot group · Admin') }
}

const pct = (value: number | null) => (value === null ? '—' : `${value}%`)

/** Before widening an update: does it help a small group, measured against a control group? */
export default async function PilotPage() {
  const [t, locale, comparison, members] = await Promise.all([getT(), getLocale(), cohortComparison(), cohortMembers()])
  const rows: { label: string; pick: (w: WindowMetrics) => string }[] = [
    { label: t('New problems solved alone, first try'), pick: (w) => `${pct(w.independentRate)} · ${w.firstTries}` },
    { label: t('Planned sessions done'), pick: (w) => `${pct(w.planDone)} · ${w.plannedSessions}` },
    { label: t('Came back on 3+ days'), pick: (w) => pct(w.returnRate) },
  ]
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Pilot group')}
        description={t('Try updates on a small group first. Each figure compares the 14 days before a student joined with the 14 days after; the control group shows what changes without the update.')}
      />

      <section className={cn(cardClass, 'p-5')}>
        <h2 className="text-[15px] font-medium">{t('Members')}</h2>
        <div className="mt-3"><PilotForm /></div>
        {members.length ? (
          <ul className="mt-4 divide-y divide-border text-sm">
            {members.map((member) => (
              <li key={member.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{member.full_name?.trim() || member.username || member.id.slice(0, 8)}{member.username ? <span className="text-muted-foreground"> @{member.username}</span> : null}</span>
                <span className="text-xs text-muted-foreground">{t(member.cohort === 'pilot' ? 'pilot' : 'control')} · {t('since {date}', { date: shortDate(member.cohort_since, locale) })}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {comparison.length ? (
        <section className={cn(cardClass, 'overflow-x-auto p-5')}>
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">{t('Measure')}</th>
                {comparison.map((group) => (
                  <th key={group.cohort} className="pb-2 font-medium" colSpan={2}>{t(group.cohort === 'pilot' ? 'pilot' : 'control')} ({group.members})</th>
                ))}
              </tr>
              <tr className="text-left text-[11px] text-muted-foreground">
                <th />
                {comparison.map((group) => [
                  <th key={`${group.cohort}-b`} className="pb-2 font-normal">{t('before')}</th>,
                  <th key={`${group.cohort}-a`} className="pb-2 font-normal">{t('after')}</th>,
                ])}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="py-2 pr-3">{row.label}</td>
                  {comparison.map((group) => [
                    <td key={`${group.cohort}-b`} className="py-2 tabular-nums text-muted-foreground">{row.pick(group.before)}</td>,
                    <td key={`${group.cohort}-a`} className="py-2 font-medium tabular-nums">{row.pick(group.after)}</td>,
                  ])}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">{t('Widen the update when the pilot improves more than the control on solving alone and on plan completion, without fewer students coming back.')}</p>
        </section>
      ) : (
        <p className={cn(cardClass, 'p-5 text-sm text-muted-foreground')}>{t('No one is in a group yet. Add a few students to the pilot and a few to the control.')}</p>
      )}
    </div>
  )
}
