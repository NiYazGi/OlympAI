import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Clock, Lock, Route } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { GoalSetup } from '@/components/path/goal-setup'
import { GoalSummary } from '@/components/path/goal-summary'
import { TargetPicker } from '@/components/path/target-picker'
import { WeekRhythm } from '@/components/path/week-rhythm'
import { DifficultyStars } from '@/components/difficulty-stars'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { buildPath, type PathStage } from '@/lib/path'
import { planForGoal, readiness } from '@/lib/goal'
import {
  getCompetitionOptions,
  getGoal,
  getProgressAnalytics,
  getSubjectSummary,
  getTaskCatalogue,
  getCurrentProfile,
} from '@/lib/supabase/queries'
import { cardClass, cn } from '@/lib/utils'

export const metadata = { title: 'Your path' }

export default function PathPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader
        title="Your path"
        description="Topics in order of difficulty. Clear most of a stage and the next one opens."
      />
      <Suspense
        fallback={
          <>
            <PendingRegion label="Laying out your path" />
            <BlockSkeleton className={`${cardClass} h-24`} />
            <BlockSkeleton className={`${cardClass} h-64`} />
          </>
        }
      >
        <Path />
      </Suspense>
    </div>
  )
}

async function Path() {
  const [profile, tasks, subjects, analytics, goal, competitions] = await Promise.all([
    getCurrentProfile(),
    getTaskCatalogue(),
    getSubjectSummary(),
    getProgressAnalytics(),
    getGoal(),
    getCompetitionOptions(),
  ])

  if (subjects.every((subject) => subject.taskCount === 0)) {
    return (
      <EmptyState
        icon={Route}
        title="No path to lay out yet"
        body="Once the task library has content, choosing a competition builds the route through it."
        action={{ href: '/sulu-ai', label: 'Open Sulu AI' }}
      />
    )
  }

  // No competition or no date yet: ask for both before drawing anything.
  if (!goal.competition || !goal.targetDate) {
    return (
      <GoalSetup
        competitions={competitions}
        currentId={goal.competition?.id ?? null}
        currentDate={goal.targetDate}
      />
    )
  }

  // A generic target (a national round, say) carries no subject of its own.
  if (!goal.subjectName) {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          {goal.competition.name} covers more than one subject — choose the one you are training in.
        </p>
        <TargetPicker subjects={subjects} current={goal.subjectId} />
      </>
    )
  }

  const path = buildPath(tasks, goal.subjectName)
  const attemptsLastWeek = analytics.recentActivity.reduce((sum, day) => sum + day.problems, 0)
  const subjectAccuracy = subjectAccuracyFor(analytics, path)
  const plan = planForGoal(path, goal.targetDate, attemptsLastWeek)
  const ready = readiness(path, subjectAccuracy)

  return (
    <>
      <GoalSummary
        goal={goal}
        plan={plan}
        ready={ready}
        competitions={competitions}
        subjects={subjects}
        next={path.next}
      />

      {plan.milestones.length > 1 ? (
        <section className={`${cardClass} p-5`}>
          <h2 className="font-semibold">Schedule</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.weeksLeft} week{plan.weeksLeft === 1 ? '' : 's'} to cover {plan.remaining}{' '}
            remaining task{plan.remaining === 1 ? '' : 's'}.
          </p>
          <ol className="mt-4 space-y-2">
            {plan.milestones.map((milestone) => (
              <li
                key={milestone.stage}
                className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">
                  week {milestone.byWeek}
                </span>
                <span className="min-w-0 flex-1 truncate">{milestone.stage}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {milestone.tasks} task{milestone.tasks === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <WeekRhythm analytics={analytics} intensity={profile?.training_intensity ?? null} />

      <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[1.4375rem] before:top-6 before:w-px before:bg-border">
        {path.stages.map((stage, index) => (
          <Stage key={stage.topic} stage={stage} index={index} />
        ))}
      </ol>
    </>
  )
}

/** Accuracy limited to the topics on this path, not the whole account. */
function subjectAccuracyFor(
  analytics: { topics: { topic: string; attempts: number; correct: number }[] },
  path: { stages: { topic: string }[] },
): number | null {
  const onPath = new Set(path.stages.map((stage) => stage.topic))
  let attempts = 0
  let correct = 0
  for (const topic of analytics.topics) {
    if (!onPath.has(topic.topic)) continue
    attempts += topic.attempts
    correct += topic.correct
  }
  return attempts === 0 ? null : Math.round((correct / attempts) * 100)
}

function Stage({ stage, index }: { stage: PathStage; index: number }) {
  const locked = stage.state === 'locked'
  const done = stage.state === 'done'

  return (
    <li className={cn('relative flex gap-4', locked && 'opacity-60')}>
      <div
        className={cn(
          'relative z-10 mt-4 flex size-12 shrink-0 items-center justify-center rounded-full border-4 border-background text-sm font-semibold',
          done
            ? 'bg-emerald-500 text-white'
            : locked
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground',
        )}
      >
        {done ? <Check className="size-5" /> : locked ? <Lock className="size-4" /> : index + 1}
      </div>

      <div className={cn(cardClass, 'min-w-0 flex-1 p-4 sm:p-5')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{stage.topic}</h3>
          <span className="text-sm tabular-nums text-muted-foreground">
            {stage.solved}/{stage.total}
          </span>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full', done ? 'bg-emerald-500' : 'bg-primary')}
            style={{ width: `${stage.percent}%` }}
          />
        </div>

        {locked ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Clear most of the previous stage to open this one.
          </p>
        ) : (
          <ul className="mt-4 space-y-1">
            {stage.tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/tasks/${task.id}`}
                  prefetch
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]',
                      task.solved
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    {task.solved ? <Check className="size-3" /> : null}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-sm',
                      task.solved && 'text-muted-foreground line-through decoration-1',
                    )}
                  >
                    {task.title}
                  </span>
                  {task.estimatedMinutes ? (
                    <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
                      <Clock className="size-3" />
                      {task.estimatedMinutes}m
                    </span>
                  ) : null}
                  <DifficultyStars level={task.difficulty} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}
