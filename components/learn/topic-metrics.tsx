import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { getReference } from '@/lib/supabase/reference'
import type { TopicLadder } from '@/lib/types'
import type { ProgressAttempt } from '@/lib/topic-progress'
import { cardClass } from '@/lib/utils'
import { getLocale, getT } from '@/lib/i18n/server'

const LOCALE_TAG = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' } as const

export async function TopicMetrics({ topic, expand }: { topic: TopicLadder; expand?: string }) {
  const [t, locale] = await Promise.all([getT(), getLocale()])
  const date = (value: string | null) =>
    value
      ? new Date(value).toLocaleString(LOCALE_TAG[locale], { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Almaty' })
      : t('Date not recorded')
  const { metrics, activity } = topic
  const reference = await getReference()
  const title = new Map(reference.tasks.map((task) => [task.id, task.title]))
  function attemptList(attempts: ProgressAttempt[]) {
    return attempts.length ? <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
      {attempts.map((row) => <li key={row.id} className="border-t border-border pt-2">
        <Link href={`/tasks/${row.task_id}/attempts/${row.id}`} className="font-medium hover:underline">{title.get(row.task_id) ?? row.task_id}</Link>
        <p className="mt-0.5 text-xs text-muted-foreground">{date(row.created_at)} · {row.score}/100 · {row.is_correct ? t('solution accepted') : t('not fully accepted')}{row.mock_test_id ? ` · ${t('from a mock test')}` : ''}</p>
      </li>)}
    </ul> : <p className="mt-2 text-sm text-muted-foreground">{t('No linked attempts yet.')}</p>
  }
  const confirmed = metrics.skills.filter((skill) => skill.confirmed).length
  const panels = [
    {
      id: 'route-evidence', label: t('Route actions'), value: metrics.coverage.ready ? `${metrics.route.completed}/${metrics.route.total}` : t('Not ready'),
      body: <>
        <p>{t('Counted actions: notes read, the latest correct answers to questions and distinct solved problems. Opening a lesson or a partial solution does not complete an action. The overall mock score is not included.')}</p>
        <ul className="mt-3 space-y-1">{topic.stages.map((stage) => <li key={stage.key}>{stage.label}: {stage.actions ? `${stage.actions.completed}/${stage.actions.total}` : t('no materials yet')}</li>)}</ul>
        <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto">{activity.map((row, index) => <li key={`${row.href}-${row.date}-${index}`} className="border-t border-border pt-2"><Link href={row.href} className="font-medium hover:underline">{row.label}</Link><p className="text-xs text-muted-foreground">{date(row.date)} · {row.detail}</p></li>)}</ul>
        {attemptList(metrics.attempts)}
      </>,
    },
    {
      id: 'skill-evidence', label: t('Skills mastered'), value: confirmed ? `${confirmed}/${metrics.skills.length}` : t('Not enough data'),
      body: <>
        <p>{t('A skill is confirmed by fully solving three different problems explicitly linked to this method. Resubmitting one problem adds nothing. The overall mock percentage does not assess a single skill.')}</p>
        {metrics.skills.length ? <ul className="mt-3 space-y-3">{metrics.skills.map((skill) => <li key={skill.id}>
          <Link href={`/methods/${skill.id}`} className="font-medium hover:underline">{skill.name}</Link>
          <p className="text-xs text-muted-foreground">{skill.confirmed ? t('Confirmed by practice') : t('Not enough data yet')} · {t('{n}/3 different problems fully solved', { n: skill.successfulTasks })}</p>
          {attemptList(skill.evidence)}
        </li>)}</ul> : <p className="mt-2">{t('The methods of this topic’s problems are not tagged yet, so no mastery percentage is calculated.')}</p>}
        {metrics.unclassifiedAttempts ? <p className="mt-3 text-xs">{t('Attempts without exact method tags: {n}. They are in your solution history but do not confirm a particular skill.', { n: metrics.unclassifiedAttempts })}</p> : null}
      </>,
    },
    {
      id: 'paper-evidence', label: t('Mock test results'), value: metrics.papers.length ? t('{n} completed', { n: metrics.papers.length }) : t('No results'),
      body: <>
        <p>{t('Each score belongs to its own paper. These are the papers with problems from this topic; a whole-paper score is not carried over into topic mastery.')}</p>
        <ul className="mt-3 space-y-3">{metrics.papers.map((paper) => <li key={paper.id} className="border-t border-border pt-2">
          <Link href={`/mock/${paper.id}`} className="font-semibold hover:underline">{paper.score_percent === null ? t('Not graded yet') : `${paper.score_percent}%`} · {date(paper.submitted_at)}</Link>
          <ul className="mt-1 text-xs text-muted-foreground">{paper.task_ids.map((id) => <li key={id}><Link href={`/tasks/${id}`} className="hover:underline">{title.get(id) ?? id}</Link></li>)}</ul>
        </li>)}</ul>
      </>,
    },
    {
      id: 'coverage-evidence', label: t('Materials available'), value: t('{n}/{total} kinds', { n: metrics.coverage.available, total: metrics.coverage.total }),
      body: <>
        <p>{t('Whether notes, questions and problems exist. This is how ready the materials are, not how well the student is doing.')}</p>
        <ul className="mt-3 space-y-1">{topic.stages.map((stage) => <li key={stage.key}>{stage.label}: {stage.state === 'empty' ? t('no materials yet') : t('{n} available', { n: stage.actions?.total ?? 0 })}</li>)}</ul>
        {!metrics.coverage.complete ? <p className="mt-3 font-medium">{metrics.coverage.ready ? t('The route is partly ready.') : t('The route is not ready yet.')}</p> : null}
      </>,
    },
  ]
  return <section id="topic-metrics" aria-label={t('What the progress is made of')} className="grid scroll-mt-6 gap-3 sm:grid-cols-2">
    {panels.map((panel) => <details key={panel.id} id={panel.id} open={expand === 'attempts' && panel.id === 'route-evidence'} className={`${cardClass} evidence-disclosure self-start overflow-hidden`}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-primary">
        <span><span className="block text-xs text-muted-foreground">{panel.label}</span><span className="mt-1 block font-semibold tabular-nums">{panel.value}</span></span>
        <ChevronDown aria-hidden className="disclosure-chevron mt-1 size-4 shrink-0 text-muted-foreground" />
      </summary>
      <div className="disclosure-body px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{panel.body}</div>
    </details>)}
  </section>
}
