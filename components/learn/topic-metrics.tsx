import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { getReference } from '@/lib/supabase/reference'
import type { TopicLadder } from '@/lib/types'
import type { ProgressAttempt } from '@/lib/topic-progress'
import { cardClass } from '@/lib/utils'

function date(value: string | null) {
  return value ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Almaty' }) : 'Дата не записана'
}

export async function TopicMetrics({ topic, expand }: { topic: TopicLadder; expand?: string }) {
  const { metrics, activity } = topic
  const reference = await getReference()
  const title = new Map(reference.tasks.map((task) => [task.id, task.title]))
  function attemptList(attempts: ProgressAttempt[]) {
    return attempts.length ? <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
      {attempts.map((row) => <li key={row.id} className="border-t border-border pt-2">
        <Link href={`/tasks/${row.task_id}/attempts/${row.id}`} className="font-medium hover:underline">{title.get(row.task_id) ?? row.task_id}</Link>
        <p className="mt-0.5 text-xs text-muted-foreground">{date(row.created_at)} · {row.score}/100 · {row.is_correct ? 'решение зачтено' : 'решение не зачтено полностью'}{row.mock_test_id ? ' · из пробника' : ''}</p>
      </li>)}
    </ul> : <p className="mt-2 text-sm text-muted-foreground">Связанных попыток пока нет.</p>
  }
  const confirmed = metrics.skills.filter((skill) => skill.confirmed).length
  const panels = [
    {
      id: 'route-evidence', label: 'Действия маршрута', value: metrics.coverage.ready ? `${metrics.route.completed}/${metrics.route.total}` : 'Не подготовлен',
      body: <>
        <p>Зачтённые действия: прочитанный конспект, последние верные ответы на вопросы и уникальные решённые задачи. Открытие урока и частичное решение не завершают действие. Общий балл пробника сюда не входит.</p>
        <ul className="mt-3 space-y-1">{topic.stages.map((stage) => <li key={stage.key}>{stage.label}: {stage.actions ? `${stage.actions.completed}/${stage.actions.total}` : 'материалов пока нет'}</li>)}</ul>
        <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto">{activity.map((row, index) => <li key={`${row.href}-${row.date}-${index}`} className="border-t border-border pt-2"><Link href={row.href} className="font-medium hover:underline">{row.label}</Link><p className="text-xs text-muted-foreground">{date(row.date)} · {row.detail}</p></li>)}</ul>
        {attemptList(metrics.attempts)}
      </>,
    },
    {
      id: 'skill-evidence', label: 'Освоенные навыки', value: confirmed ? `${confirmed}/${metrics.skills.length}` : 'Недостаточно данных',
      body: <>
        <p>Навык подтверждается полным решением трёх разных задач с явной привязкой к этому методу. Повторные отправки одной задачи не добавляют подтверждений. Общий процент пробника не оценивает отдельный навык.</p>
        {metrics.skills.length ? <ul className="mt-3 space-y-3">{metrics.skills.map((skill) => <li key={skill.id}>
          <Link href={`/methods/${skill.id}`} className="font-medium hover:underline">{skill.name}</Link>
          <p className="text-xs text-muted-foreground">{skill.confirmed ? 'Подтверждён практикой' : 'Пока недостаточно данных'} · {skill.successfulTasks}/3 разных задач решено полностью</p>
          {attemptList(skill.evidence)}
        </li>)}</ul> : <p className="mt-2">Методы задач этой темы ещё не размечены. Процент освоения не вычисляется.</p>}
        {metrics.unclassifiedAttempts ? <p className="mt-3 text-xs">Попыток без точной разметки методов: {metrics.unclassifiedAttempts}. Они видны в истории решений, но не подтверждают конкретный навык.</p> : null}
      </>,
    },
    {
      id: 'paper-evidence', label: 'Результаты пробников', value: metrics.papers.length ? `${metrics.papers.length} завершено` : 'Нет результатов',
      body: <>
        <p>Каждый балл относится только к своему туру. Здесь показаны туры, содержащие задачи этой темы; балл всего тура не переносится в освоение темы.</p>
        <ul className="mt-3 space-y-3">{metrics.papers.map((paper) => <li key={paper.id} className="border-t border-border pt-2">
          <Link href={`/mock/${paper.id}`} className="font-semibold hover:underline">{paper.score_percent === null ? 'Ещё не оценён' : `${paper.score_percent}%`} · {date(paper.submitted_at)}</Link>
          <ul className="mt-1 text-xs text-muted-foreground">{paper.task_ids.map((id) => <li key={id}><Link href={`/tasks/${id}`} className="hover:underline">{title.get(id) ?? id}</Link></li>)}</ul>
        </li>)}</ul>
      </>,
    },
    {
      id: 'coverage-evidence', label: 'Обеспеченность материалами', value: `${metrics.coverage.available}/${metrics.coverage.total} видов`,
      body: <>
        <p>Наличие конспекта с содержимым, вопросов и задач. Это готовность материалов, а не успеваемость ученика.</p>
        <ul className="mt-3 space-y-1">{topic.stages.map((stage) => <li key={stage.key}>{stage.label}: {stage.state === 'empty' ? 'материалов пока нет' : `${stage.actions?.total ?? 0} доступно`}</li>)}</ul>
        {!metrics.coverage.complete ? <p className="mt-3 font-medium">{metrics.coverage.ready ? 'Маршрут подготовлен частично.' : 'Маршрут ещё не подготовлен.'}</p> : null}
      </>,
    },
  ]
  return <section id="topic-metrics" aria-label="Из чего складывается прогресс" className="grid scroll-mt-6 gap-3 sm:grid-cols-2">
    {panels.map((panel) => <details key={panel.id} id={panel.id} open={expand === 'attempts' && panel.id === 'route-evidence'} className={`${cardClass} evidence-disclosure self-start overflow-hidden`}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-primary">
        <span><span className="block text-xs text-muted-foreground">{panel.label}</span><span className="mt-1 block font-semibold tabular-nums">{panel.value}</span></span>
        <ChevronDown aria-hidden className="disclosure-chevron mt-1 size-4 shrink-0 text-muted-foreground" />
      </summary>
      <div className="disclosure-body px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{panel.body}</div>
    </details>)}
  </section>
}
