import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock, Trophy, Zap } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { DifficultyStars, difficultyLabel } from '@/components/difficulty-stars'
import { SolutionPanel } from '@/components/problems/solution-panel'
import { SuluAssistantPanel } from '@/components/problems/sulu-assistant-panel'
import { Badge } from '@/components/ui/badge'
import { ResourceList, Attribution } from '@/components/resources/resource-list'
import { getTaskDetail, getTaskResources } from '@/lib/supabase/queries'
import type { Licence } from '@/lib/licence'
import { xpForFirstSolve } from '@/lib/xp'
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
  const resources = await getTaskResources(slug)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href="/tasks"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to tasks
      </Link>

      <PageHeader title={task.title} description={`${task.subject} · ${task.topic}`}>
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
              {task.estimatedMinutes} min
            </Badge>
          ) : null}
          {!task.solved ? (
            <Badge variant="outline" className="gap-1.5 text-primary">
              <Zap className="size-3" />
              {xpForFirstSolve(task.difficulty)} XP
            </Badge>
          ) : null}
          <div className={`${cardClass} flex items-center gap-2 px-3 py-1.5`}>
            <span className="text-xs text-muted-foreground">{difficultyLabel(task.difficulty)}</span>
            <DifficultyStars level={task.difficulty} />
          </div>
        </div>
      </PageHeader>

      {task.attempts > 0 ? (
        <section
          className={`${cardClass} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}
        >
          <div>
            <p className="text-sm font-medium">
              {task.solved ? 'You have solved this task.' : 'Attempted, not solved yet.'}
            </p>
            <p className="text-xs text-muted-foreground">
              {task.attempts} attempt{task.attempts === 1 ? '' : 's'}
              {task.bestScore !== null ? ` · best score ${task.bestScore}/100` : ''}
            </p>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <section className={`${cardClass} p-6`}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Problem
            </h2>
            <p className="mt-3 leading-relaxed text-foreground">{task.problem}</p>

            <div className="mt-3">
            <Attribution
              licence={task.licence as Licence}
              attribution={task.attribution}
              url={task.sourceUrl}
            />
            </div>

            {task.diagramUrl ? (
              <div className="mt-5 overflow-hidden rounded-lg ring-1 ring-foreground/10">
                <Image
                  src={task.diagramUrl}
                  alt={`Diagram for ${task.title}`}
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
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Given
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                    Find
                  </p>
                  <p className="mt-1 text-sm text-foreground">{task.findPrompt}</p>
                </div>
              ) : null}
            </section>
          ) : null}

          <ResourceList resources={resources} />
        </div>

        <div className="lg:col-span-2">
          <div className="flex flex-col gap-6">
            <SolutionPanel hints={task.hints} taskId={task.id} />
            <SuluAssistantPanel taskId={task.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
