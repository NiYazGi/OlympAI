import { Reveal } from '@/components/reveal'
import Link from 'next/link'
import { ArrowRight, CalendarRange, Check, Flag, Lock } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { DifficultyStars } from '@/components/difficulty-stars'
import { Meter } from '@/components/meter'
import { ReadinessRing } from '@/components/path/goal-summary'
import { BlockSkeleton, ListSkeleton, PendingRegion } from '@/components/skeletons'
import { buildPath, type PathStage } from '@/lib/path'
import { planForGoal, readiness, workloadCopy } from '@/lib/goal'
import { getCurrentProfile, getGoal, getProgressAnalytics, getTaskCatalogue } from '@/lib/supabase/queries'
import { getStudentTrack } from '@/lib/supabase/track'
import { getLocale, getT } from '@/lib/i18n'
import { formatDay, type Locale } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import { cardClass, cn, labelClass } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t.plan.title }
}

/**
 * The route to the target, week by week.
 *
 * Everything on this page was already being computed and none of it was ever
 * shown: `planForGoal` has produced dated milestones since the goal was built,
 * and they went straight into a variable nobody read. A plan that exists only
 * inside a function is not a plan the student has.
 *
 * Three questions, in the order they get asked. How long is left. What do I do
 * this week. What is the shape of the rest. The last of those is the one that
 * makes the first two mean anything: seeing that geometry is four weeks away
 * is what makes this week's twelve problems feel like a step rather than a
 * quota.
 */
export default async function PlanPage() {
  const t = await getT()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader title={t.plan.title} description={t.plan.description} />
      <Reveal
        fallback={
          <>
            <PendingRegion label={t.plan.loading} />
            <BlockSkeleton className={`${cardClass} h-40`} />
            <ListSkeleton rows={4} />
          </>
        }
      >
        <Plan />
      </Reveal>
    </div>
  )
}

async function Plan() {
  const [goal, tasks, analytics, track, profile, t, locale] = await Promise.all([
    getGoal(),
    getTaskCatalogue(),
    getProgressAnalytics(),
    getStudentTrack(),
    getCurrentProfile(),
    getT(),
    getLocale(),
  ])

  if (!goal.subjectName || !goal.targetDate) {
    return (
      <EmptyState
        icon={Flag}
        title={t.plan.noTarget}
        body={t.plan.noTargetBody}
        action={{ href: '/learn', label: t.plan.setTarget }}
      />
    )
  }

  const path = buildPath(tasks, goal.subjectName, track.track)
  const lastWeek = analytics.recentActivity.reduce((sum, day) => sum + day.problems, 0)
  const plan = planForGoal(path, goal.targetDate, lastWeek, profile?.training_intensity ?? null)
  const ready = readiness(path, analytics.totalAttempts > 0 ? analytics.accuracy : null)
  const byWeek = new Map(plan.milestones.map((m) => [m.stage, m.byWeek]))

  // The next problems on the route, as many as a week is supposed to hold.
  // Taken in route order rather than by difficulty: the point of a route is
  // that it has one.
  const upNext = path.stages
    .filter((stage) => stage.state !== 'locked')
    .flatMap((stage) => stage.todo.map((task) => ({ stage, task })))
    .slice(0, Math.max(1, plan.tasksPerWeek))

  return (
    <>
      <section className={cn(cardClass, 'flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6')}>
        <ReadinessRing ready={ready} t={t} />
        <div className="min-w-0 flex-1">
          <p className={labelClass}>{t.dashboard.preparingFor}</p>
          <h2 className="font-display mt-1 truncate text-xl font-bold tracking-[-0.02em]">
            {goal.competition?.name ?? t.subjects[goal.subjectName] ?? goal.subjectName}
          </h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarRange className="size-3.5" />
              {t.common.daysLeft(plan.daysLeft)}
            </span>
            <span>{t.plan.weeksLeft(plan.weeksLeft)}</span>
            <span>
              {t.plan.rhythm(plan.tasksPerWeek)} · {workloadCopy(plan.workload, t).label}
            </span>
          </p>
          <p
            className={cn(
              'mt-3 rounded-lg p-2.5 text-sm',
              plan.fits ? 'bg-accent text-accent-foreground' : 'bg-warning/10 text-warning',
            )}
          >
            {t.plan.fitLine(plan.weeksNeeded, plan.weeksLeft)}{' '}
            {workloadCopy(plan.workload, t).note}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium">{t.plan.pace}: </span>
            {plan.onTrack
              ? t.plan.onTrack(plan.currentPace, plan.tasksPerWeek)
              : t.plan.behind(plan.currentPace, plan.tasksPerWeek)}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={labelClass}>{t.plan.thisWeek}</h2>
        {upNext.length === 0 ? (
          <p className={cn(cardClass, 'p-5 text-sm text-muted-foreground')}>{t.plan.nothingLeft}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t.plan.thisWeekNote(upNext.length)}</p>
            <ul className="grid gap-2">
              {upNext.map(({ stage, task }) => (
                <li key={task.id}>
                  <Link
                    href={`/tasks/${task.id}`}
                    prefetch={false}
                    className={cn(
                      cardClass,
                      'group flex items-center gap-3 p-3.5 transition-colors hover:bg-muted/40',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{task.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.topics[stage.topic] ?? stage.topic}
                      </span>
                    </span>
                    <DifficultyStars level={task.difficulty} />
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className={labelClass}>{t.plan.route}</h2>
        <p className="text-sm text-muted-foreground">{t.plan.routeNote}</p>
        <ol className="grid gap-2">
          {path.stages.map((stage) => (
            <Stage
              key={stage.topic}
              stage={stage}
              week={byWeek.get(stage.topic) ?? null}
              t={t}
              locale={locale}
            />
          ))}
        </ol>
      </section>

      {path.thin.length ? (
        <p className="text-sm leading-6 text-pretty text-muted-foreground">
          {t.plan.thinNote(
            path.thin.map((entry) => t.topics[entry.topic] ?? entry.topic).join(', '),
          )}
        </p>
      ) : null}

      {path.skipped.length ? (
        <p className="text-sm leading-6 text-pretty text-muted-foreground">
          {t.plan.skippedNote(path.skipped.map((topic) => t.topics[topic] ?? topic).join(', '))}
        </p>
      ) : null}

      <p className="text-sm leading-6 text-pretty text-muted-foreground">{t.plan.honest}</p>
    </>
  )
}

function Stage({
  stage,
  week,
  t,
  locale,
}: {
  stage: PathStage
  week: number | null
  t: Dictionary
  locale: Locale
}) {
  const done = stage.state === 'done'
  const locked = stage.state === 'locked'
  // The teacher's date when there is one; the pace estimate otherwise.
  const when = stage.due ? t.plan.byDate(formatDay(stage.due, locale)) : week ? t.plan.byWeek(week) : null

  return (
    <li className={cn(cardClass, 'p-4', locked && 'opacity-60')}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            done
              ? 'bg-primary/15 text-primary'
              : locked
                ? 'bg-muted text-muted-foreground'
                : 'bg-primary text-primary-foreground',
          )}
        >
          {done ? <Check className="size-4" /> : locked ? <Lock className="size-3.5" /> : null}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-medium">{t.topics[stage.topic] ?? stage.topic}</span>
            <span className="text-caption font-semibold text-muted-foreground">
              {done ? t.plan.done : locked ? t.plan.locked : t.plan.current}
              {when && !done ? ` · ${when}` : ''}
              {stage.chosen ? ` · ${t.plan.teacherList}` : ''}
            </span>
          </span>
          <Meter value={stage.percent} className="mt-2 h-1" />
        </span>

        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {stage.chosen
            ? t.route.solvedOf(stage.solved, stage.target)
            : t.plan.ofSolved(stage.solved, stage.total)}
        </span>
      </div>

      {stage.note && !done ? <TeacherNote note={stage.note} t={t} /> : null}
    </li>
  )
}

/** A teacher's note on a section, set apart so it reads as theirs. */
function TeacherNote({ note, t }: { note: string; t: Dictionary }) {
  return (
    <p className="mt-3 rounded-lg border-l-2 border-primary bg-muted/40 px-3 py-2 text-sm leading-6 text-pretty whitespace-pre-line">
      <span className="font-medium">{t.plan.teacherNote}: </span>
      {note}
    </p>
  )
}
