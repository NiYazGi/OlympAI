import { ViewTransition } from 'react'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Clock, Trophy, Zap } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { DifficultyStars, difficultyLabel } from '@/components/difficulty-stars'
import { MathParagraphs, MathText } from '@/components/math-text'
import { AttemptList } from '@/components/problems/attempt-list'
import { SolutionPanel } from '@/components/problems/solution-panel'
import { SuluAssistantPanel } from '@/components/problems/sulu-assistant-panel'
import { TaskWorkspace } from '@/components/problems/task-workspace'
import { Badge } from '@/components/ui/badge'
import { ResourceList, Attribution } from '@/components/resources/resource-list'
import { getTaskAttemptHistory, getTaskDetail, getTaskResources } from '@/lib/supabase/queries'
import { getTopicShortcut } from '@/lib/supabase/study'
import { TopicShortcutPanel } from '@/components/learn/topic-shortcut'
import type { Licence } from '@/lib/licence'
import { xpForFirstSolve } from '@/lib/xp'
import { getT } from '@/lib/i18n'
import { cardClass } from '@/lib/utils'

// Task content is behind RLS and the solved state is per-user, so this page is
// rendered per request. It previously ran generateStaticParams over the mock
// catalogue, which baked one visitor's view into the build.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const task = await getTaskDetail(slug)
  return { title: task ? task.title : 'Task' }
}

export default async function TaskPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const task = await getTaskDetail(slug)
  if (!task) notFound()
  const [resources, shortcut, history, t] = await Promise.all([
    getTaskResources(slug),
    getTopicShortcut(task.topic),
    getTaskAttemptHistory(task.id),
    getT(),
  ])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <BackLink href="/tasks">{t.tasks.back}</BackLink>

      <PageHeader
        title={
          <ViewTransition name={`task-${task.id}`} share="morph" default="none">
            <span>{task.title}</span>
          </ViewTransition>
        }
        description={`${t.subjects[task.subject] ?? task.subject} · ${t.topics[task.topic] ?? task.topic}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {task.source ? (
            <Badge variant="outline" className="gap-1.5">
              <Trophy className="size-3" />
              {task.source}
            </Badge>
          ) : null}
          {task.estimatedMinutes ? (
            <Badge variant="outline" className="gap-1.5">
              <Clock className="size-3" />
              {t.tasks.minutes(task.estimatedMinutes)}
            </Badge>
          ) : null}
          {!task.solved ? (
            <Badge variant="outline" className="gap-1.5 text-primary">
              <Zap className="size-3" />
              {xpForFirstSolve(task.difficulty)} XP
            </Badge>
          ) : null}
          <div className={`${cardClass} flex items-center gap-2 px-3 py-1.5`}>
            <span className="text-xs text-muted-foreground">
              {difficultyLabel(task.difficulty, t)}
            </span>
            <DifficultyStars level={task.difficulty} label={t.bank.difficultyAria(task.difficulty)} />
          </div>
        </div>
      </PageHeader>

      {/* The attempts used to be a line above the statement — "3 attempts, best
          score 71/100". They are a list beside the solution now, each opening
          its own protocol, which is where a second try is worth comparing. */}
      <TaskWorkspace
        statement={
          <>
          {/* Given, not written: the statement sits on the wall tint, and the
              student's own work beside it on white. */}
          <section className="rounded-sm bg-muted p-6 ring-1 ring-border">
            <h2 className="font-display text-block font-semibold">{t.tasks.problem}</h2>
            <div className="mt-3 space-y-3">
              <MathParagraphs
                text={task.problem}
                className="font-reading max-w-[68ch] text-reading text-foreground"
                figureAlt={t.tasks.diagramAlt(task.title)}
              />
            </div>

            <div className="mt-3">
            <Attribution
              licence={task.licence as Licence}
              attribution={task.attribution}
              url={task.sourceUrl}
            />
            </div>

            {task.diagramUrl ? (
              <div className="mt-5 overflow-hidden rounded-sm bg-card p-3 ring-1 ring-border">
                <Image
                  src={task.diagramUrl}
                  alt={t.tasks.diagramAlt(task.title)}
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
                  <h2 className="text-caption font-semibold text-muted-foreground">
                    {t.tasks.given}
                  </h2>
                  <ul className="mt-3 flex flex-col gap-2">
                    {task.given.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-2 size-1.5 shrink-0 bg-foreground" />
                        <span className="text-foreground">
                          <MathText>{item}</MathText>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {task.findPrompt ? (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-caption font-semibold text-accent-foreground">
                    {t.tasks.find}
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    <MathText>{task.findPrompt}</MathText>
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          <ResourceList resources={resources} />
          </>
        }
        solution={
          <>
            <section className={`${cardClass} p-5 sm:p-6`}>
              <SolutionPanel hints={task.hints} taskId={task.id} />
            </section>
            <AttemptList taskId={task.id} attempts={history} />
            {shortcut ? <TopicShortcutPanel shortcut={shortcut} /> : null}
            <SuluAssistantPanel taskId={task.id} />
          </>
        }
      />
    </div>
  )
}
