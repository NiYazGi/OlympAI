import { ViewTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock, Trophy, Zap } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { MAX_POINTS } from '@/lib/protocol'
import { SaveTaskButton } from '@/components/problems/save-task-button'
import { PrintButton } from '@/components/print-button'
import { DifficultyStars, difficultyLabel } from '@/components/difficulty-stars'
import { SolutionPanel } from '@/components/problems/solution-panel'
import { SuluAssistantPanel } from '@/components/problems/sulu-assistant-panel'
import { Badge } from '@/components/ui/badge'
import { ResourceList, Attribution } from '@/components/resources/resource-list'
import { getServerDraft, getTaskDetail, getTaskHistory, getTaskReports, getTaskResources } from '@/lib/supabase/queries'
import { AttemptHistory } from '@/components/problems/attempt-history'
import { ReportIssue } from '@/components/problems/report-issue'
import { TaskMethodGraph } from '@/components/learn/task-method-graph'
import { methodsForTask } from '@/lib/task-methods'
import type { Licence } from '@/lib/licence'
import { xpForFirstSolve } from '@/lib/xp'
import { cardClass } from '@/lib/utils'
import { getT } from '@/lib/i18n/server'
import { MathText } from '@/components/math-text'

// Task content is behind RLS and the solved state is per-user, so this page is
// rendered per request. It previously ran generateStaticParams over the mock
// catalogue, which baked one visitor's view into the build.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const task = await getTaskDetail(slug)
  const t = await getT()
  return { title: task ? task.title : t('Task') }
}

export default async function TaskPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await getT()

  const { slug } = await params
  const task = await getTaskDetail(slug)
  if (!task) notFound()
  const [resources, history, reports, serverDraft] = await Promise.all([
    getTaskResources(slug),
    getTaskHistory(slug),
    getTaskReports(slug),
    getServerDraft(slug),
  ])

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href="/tasks"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('Back to problems')}
      </Link>

      <PageHeader
        title={
          <ViewTransition name={`task-${task.id}`} share="morph" default="none">
            <span>{task.title}</span>
          </ViewTransition>
        }
        description={[
          t(task.subject),
          t(task.topic),
          task.gradeMin === null || task.gradeMax === null
            ? null
            : task.gradeMin === task.gradeMax
              ? t('Grade {n}', { n: task.gradeMin })
              : t('Grades {from}–{to}', { from: task.gradeMin, to: task.gradeMax }),
        ]
          .filter(Boolean)
          .join(' · ')}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <SaveTaskButton taskId={task.id} initial={task.saved} />
          <PrintButton />
          {task.source ? (
            // Sources run to "Республиканская олимпиада по физике, 2016, 9 класс":
            // allowed to wrap, or the badge alone was wider than a phone.
            <Badge variant="outline" className="h-auto max-w-full shrink gap-1.5 text-left whitespace-normal">
              <Trophy className="size-3 shrink-0" />
              {task.source}
            </Badge>
          ) : null}
          {task.estimatedMinutes ? (
            <Badge variant="outline" className="gap-1.5">
              <Clock className="size-3" />
              {task.estimatedMinutes} {t('min')}
            </Badge>
          ) : null}
          {!task.solved ? (
            <Badge variant="outline" className="gap-1.5 text-primary">
              <Zap className="size-3" />
              {xpForFirstSolve(task.difficulty)} {t('XP')}
            </Badge>
          ) : null}
          <div className={`${cardClass} flex items-center gap-2 px-3 py-1.5`}>
            <span className="text-xs text-muted-foreground">{t(difficultyLabel(task.difficulty))}</span>
            <DifficultyStars level={task.difficulty} />
          </div>
        </div>
      </PageHeader>

      {task.attempts > 0 ? (
        <section
          className={`${cardClass} print-hide flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}
        >
          <div>
            <p className="text-sm font-medium">
              {task.solved ? t('You have solved this task.') : t('Attempted, not solved yet.')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('{n} {n|attempt|attempts}', { n: task.attempts })}
              {/* The same scale as the history below: points out of 7, converted the
                  same way for attempts graded before the protocol existed. */}
              {history.length ? t(' · best {n} of {max}', { n: Math.max(...history.map((attempt) => attempt.points)), max: MAX_POINTS }) : ''}
            </p>
          </div>
        </section>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-3">
          <section className={`${cardClass} min-w-0 p-4 sm:p-6`}>
            <h2 className="eyebrow">
              {t('Problem')}
            </h2>
            <MathText text={task.problem} className="mt-3 break-words text-foreground" />

            <div className="mt-3">
            <Attribution
              licence={task.licence as Licence}
              attribution={task.attribution}
              url={task.sourceUrl}
            />
            </div>
            <div className="mt-3">
              <ReportIssue taskId={task.id} kind="statement" />
            </div>

            {task.diagramUrl ? (
              <div className="mt-5 overflow-hidden rounded-lg ring-1 ring-foreground/10">
                <Image
                  src={task.diagramUrl}
                  alt={t('Diagram for {title}', { title: task.title })}
                  width={720}
                  height={420}
                  className="h-auto w-full bg-card"
                />
              </div>
            ) : null}
          </section>

          {task.given.length || task.findPrompt ? (
            <section className={`${cardClass} p-6`}>
              {task.given.length ? (
                <>
                  <h2 className="eyebrow">
                    {t('Given')}
                  </h2>
                  <ul className="mt-3 flex flex-col gap-2">
                    {task.given.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="font-mono text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {task.findPrompt ? (
                <div className="mt-5 rounded-lg bg-accent p-4">
                  <p className="eyebrow">
                    {t('Find')}
                  </p>
                  <p className="mt-1 text-sm text-foreground">{task.findPrompt}</p>
                </div>
              ) : null}
            </section>
          ) : null}

          <div className="print-hide flex flex-col gap-6">
          <TaskMethodGraph taskId={task.id} />
          <ResourceList resources={methodsForTask(task.id).length ? [] : resources} />
          </div>
        </div>

        <div className="print-hide min-w-0 lg:col-span-2">
          <div className="flex flex-col gap-6">
            <SolutionPanel taskId={task.id} serverDraft={serverDraft} />
            <AttemptHistory taskId={task.id} attempts={history} reports={reports} />
            <SuluAssistantPanel taskId={task.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
