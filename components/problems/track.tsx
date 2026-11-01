import Link from 'next/link'
import { ArrowRight, Check, Clock, Library, Lock } from 'lucide-react'
import { DifficultyStars, difficultyLabel } from '@/components/difficulty-stars'
import { Meter } from '@/components/meter'
import { getLocale, getT } from '@/lib/i18n'
import { formatDay, type Locale } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import type { LearningPath, PathStage, PathTask } from '@/lib/path'
import type { StudentTrack } from '@/lib/supabase/track'
import { cardClass, cn, labelClass, liftClass } from '@/lib/utils'

/**
 * The route through a subject, as a thing to work down.
 *
 * This replaced a filterable list of 1625 problems as the first thing /tasks
 * showed. The list was not wrong — it is still a click away — but it answered
 * "what is there" to somebody who had come to ask "what now", and a student
 * who has to compose their own curriculum out of a search box has been handed
 * the teacher's job.
 *
 * Three bands, in the order they get read: the section you are on, with its
 * problems; the sections after it; the ones behind you, collapsed.
 */
export async function Track({ path, from }: { path: LearningPath; from: StudentTrack['from'] }) {
  const [t, locale] = await Promise.all([getT(), getLocale()])
  const current = path.stages.find((stage) => stage.state === 'current') ?? null
  const later = path.stages.filter((stage) => stage.state === 'locked')
  const done = path.stages.filter((stage) => stage.state === 'done')

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={labelClass}>{t.route.title}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {from
              ? from.teacherName
                ? t.route.fromTeacherNamed(from.name, from.teacherName)
                : t.route.fromTeacher(from.name)
              : t.route.defaultOrder}
          </p>
        </div>
        <Link
          href="/tasks?list=1"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Library className="size-4" /> {t.route.openCatalogue}
        </Link>
      </div>

      <div className={cn(cardClass, 'p-4 sm:p-5')}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium">{t.plan.ofSolved(path.solvedTasks, path.totalTasks)}</span>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {t.route.inLibrary(path.libraryTasks)}
          </span>
        </div>
        <Meter value={path.percent} className="mt-2.5" label={t.route.title} />
      </div>

      {current ? (
        <Current stage={current} t={t} locale={locale} />
      ) : (
        <div className={cn(cardClass, 'p-5 sm:p-6')}>
          <h3 className="font-semibold">{t.route.allDone}</h3>
          <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">
            {t.route.allDoneBody}
          </p>
          <Link
            href="/mock"
            prefetch={false}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {t.route.sitPaper} <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      {later.length ? (
        <div className="space-y-2">
          <h3 className={labelClass}>{t.route.upNext}</h3>
          <ol className="grid gap-2">
            {later.map((stage) => (
              <Upcoming key={stage.topic} stage={stage} t={t} locale={locale} />
            ))}
          </ol>
        </div>
      ) : null}

      {path.thin.length ? (
        <p className="text-sm leading-6 text-pretty text-muted-foreground">
          {t.plan.thinNote(path.thin.map((entry) => t.topics[entry.topic] ?? entry.topic).join(', '))}
        </p>
      ) : null}

      {path.skipped.length ? (
        <p className="text-sm leading-6 text-pretty text-muted-foreground">
          {t.plan.skippedNote(path.skipped.map((topic) => t.topics[topic] ?? topic).join(', '))}
        </p>
      ) : null}

      {done.length ? (
        <div className="space-y-2">
          <h3 className={labelClass}>{t.route.done}</h3>
          <ol className="grid gap-2">
            {done.map((stage) => (
              <Behind key={stage.topic} stage={stage} t={t} />
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  )
}

/** The section being worked, with the problems it is asking for. */
function Current({ stage, t, locale }: { stage: PathStage; t: Dictionary; locale: Locale }) {
  return (
    <div className={cn(cardClass, 'overflow-hidden')}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4 sm:p-5">
        <div className="min-w-0">
          <p className={labelClass}>
            {t.route.nowDoing}
            {stage.due ? ` · ${t.plan.byDate(formatDay(stage.due, locale))}` : ''}
            {stage.chosen ? ` · ${t.plan.teacherList}` : ''}
          </p>
          <h3 className="font-display mt-1 text-xl font-bold tracking-[-0.02em]">
            {t.topics[stage.topic] ?? stage.topic}
          </h3>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm tabular-nums">
            {t.route.solvedOf(stage.solved, stage.target)}
          </p>
          <p className="text-xs text-muted-foreground">{t.route.inLibrary(stage.total)}</p>
        </div>
      </div>

      {stage.note ? (
        <p className="mx-4 mb-4 rounded-lg border-l-2 border-primary bg-muted/40 px-3 py-2 text-sm leading-6 text-pretty whitespace-pre-line sm:mx-5">
          <span className="font-medium">{t.plan.teacherNote}: </span>
          {stage.note}
        </p>
      ) : null}

      <Meter value={stage.percent} className="h-1 rounded-none" />

      <ol className="divide-y divide-border">
        {stage.todo.map((task) => (
          <li key={task.id}>
            <TaskRow task={task} t={t} />
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * One problem, with its band named rather than only starred.
 *
 * The stars alone are a count; "Medium" is the word a student uses when they
 * decide whether they have an hour for this.
 */
function TaskRow({ task, t }: { task: PathTask; t: Dictionary }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      prefetch={false}
      className={cn('group flex items-center gap-3 px-4 py-3 sm:px-5', liftClass)}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{task.title}</span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <DifficultyStars level={task.difficulty} />
          {difficultyLabel(task.difficulty, t)}
          {task.estimatedMinutes ? (
            <>
              <Clock className="size-3" />
              {t.tasks.minutes(task.estimatedMinutes)}
            </>
          ) : null}
          {task.attempts > 0 ? `· ${t.bank.attemptsBadge(task.attempts)}` : null}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  )
}

function Upcoming({ stage, t, locale }: { stage: PathStage; t: Dictionary; locale: Locale }) {
  return (
    <li className={cn(cardClass, 'flex items-center gap-3 p-3.5 opacity-70')}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Lock className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {t.topics[stage.topic] ?? stage.topic}
        {stage.due ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {t.plan.byDate(formatDay(stage.due, locale))}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {t.route.solvedOf(stage.solved, stage.target)}
      </span>
    </li>
  )
}

function Behind({ stage, t }: { stage: PathStage; t: Dictionary }) {
  return (
    <li className={cn(cardClass, 'flex items-center gap-3 p-3.5')}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Check className="size-3.5" />
      </span>
      <Link
        href={`/tasks?list=1&topic=${encodeURIComponent(stage.topic)}`}
        prefetch={false}
        className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
      >
        {t.topics[stage.topic] ?? stage.topic}
      </Link>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {t.route.solvedCount(stage.solved)}
      </span>
    </li>
  )
}
