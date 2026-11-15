import Link from 'next/link'
import type { analyseCompetition } from '@/lib/competition-analysis'
import type { PreparationPlan } from '@/lib/preparation'
import { getT } from '@/lib/i18n/server'
import { cardClass } from '@/lib/utils'

export async function ArchiveAnalysis({ analysis, daily }: {
  analysis: ReturnType<typeof analyseCompetition>
  daily?: PreparationPlan['daily']
}) {
  const t = await getT()
  return (
    <section className={cardClass + ' p-5 sm:p-6'}>
      <h2 className="text-lg font-semibold">{t('What your program is based on')}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {analysis.hasArchive
          ? t('{n} problems from this competition were analysed by topic. Archive problems are selected first.', { n: analysis.taskCount })
          : t('This competition has no imported archive yet. Topic selection uses comparable problems in the same subject.')}
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {analysis.topics.map(({ topic, count }) => (
          <li key={topic} className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <Link href={'/tasks?topic=' + encodeURIComponent(topic)} className="hover:underline">{t(topic)}</Link>
            <span className="text-xs text-muted-foreground tabular-nums">{t('{n} problems', { n: count })}</span>
          </li>
        ))}
      </ul>
      {daily ? (
        <div className="mt-4 space-y-2 text-sm leading-6">
          <p>Объём зависит от доступных минут: до {daily.tasks} задач, теория, квиз и разбор распределяются по занятиям. Длинные активности продолжаются в следующие дни. Пробники и их разборы занимают отдельное время.</p>
          {daily.overloadedDays > 0 ? (
            <p className="text-muted-foreground">{t('The selected daily volume exceeds your time budget on {n} days. Increase your session time or reduce the daily problem count.', { n: daily.overloadedDays })}</p>
          ) : null}
          {daily.contentShortage ? (
            <p className="text-muted-foreground">Не все оставшиеся блоки можно целиком поместить в выбранный срок. План показывает посильный объём; невыбранные задачи не превращаются в долг.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
