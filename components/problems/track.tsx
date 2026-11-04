import Link from 'next/link'
import { ArrowRight, Check, Clock, Library, Lock } from 'lucide-react'
import { DifficultyStars, difficultyLabel } from '@/components/difficulty-stars'
import { Meter } from '@/components/meter'
import { getLocale, getT } from '@/lib/i18n/server'
import { formatDay, type Locale } from '@/lib/i18n/config'
import type { Translate } from '@/lib/i18n/config'
import type { LearningPath, PathStage, PathTask } from '@/lib/path'
import type { StudentTrack } from '@/lib/supabase/track'
import { cardClass, cn } from '@/lib/utils'

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
          <h2 className={'eyebrow'}>{t('Your track')}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {from
              ? from.teacherName
                ? t('Order set by {teacher} · {klass}', { klass: from.name, teacher: from.teacherName })
                : t('Order set by your teacher · {klass}', { klass: from.name })
              : t('The default order for this subject')}
          </p>
        </div>
        <Link
          href="/tasks?list=1"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Library className="size-4" /> {t('Whole catalogue')}
        </Link>
      </div>

      <div className={cn(cardClass, 'p-4 sm:p-5')}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium">{t('{a} of {b}', { a: path.solvedTasks, b: path.totalTasks })}</span>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {t('{n} in the library', { n: path.libraryTasks })}
          </span>
        </div>
        <Meter value={path.percent} className="mt-2.5" label={t('Your track')} />
      </div>

      {current ? (
        <Current stage={current} t={t} locale={locale} />
      ) : (
        <div className={cn(cardClass, 'p-5 sm:p-6')}>
          <h3 className="font-semibold">{t('Every section on the track is done')}</h3>
          <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">
            {t('The track asks for a number of problems per section, not for all of them. The catalogue holds the rest, and a timed paper is the better measure from here.')}
          </p>
          <Link
            href="/mock"
            prefetch={false}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {t('Sit a paper')} <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      {later.length ? (
        <div className="space-y-2">
          <h3 className={'eyebrow'}>{t('Next')}</h3>
          <ol className="grid gap-2">
            {later.map((stage) => (
              <Upcoming key={stage.topic} stage={stage} t={t} locale={locale} />
            ))}
          </ol>
        </div>
      ) : null}

      {path.thin.length ? (
        <p className="text-sm leading-6 text-pretty text-muted-foreground">
          {t('Not in the route, too little written: {sections}. They are in the catalogue whenever you want them.', { sections: path.thin.map((entry) => t(entry.topic)).join(', ') })}
        </p>
      ) : null}

      {path.skipped.length ? (
        <p className="text-sm leading-6 text-pretty text-muted-foreground">
          {t('Your teacher has left {sections} out of this route. They are still in the library.', { sections: path.skipped.map((topic) => t(topic)).join(', ') })}
        </p>
      ) : null}

      {done.length ? (
        <div className="space-y-2">
          <h3 className={'eyebrow'}>{t('Behind you')}</h3>
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
function Current({ stage, t, locale }: { stage: PathStage; t: Translate; locale: Locale }) {
  return (
    <div className={cn(cardClass, 'overflow-hidden')}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4 sm:p-5">
        <div className="min-w-0">
          <p className={'eyebrow'}>
            {t('Now')}
            {stage.due ? ` · ${t('by {date}', { date: formatDay(stage.due, locale) })}` : ''}
            {stage.chosen ? ` · ${t('chosen by your teacher')}` : ''}
          </p>
          <h3 className="font-display mt-1 text-xl font-bold tracking-[-0.02em]">
            {t(stage.topic)}
          </h3>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm tabular-nums">
            {t('{solved} of {target} solved', { solved: stage.solved, target: stage.target })}
          </p>
          <p className="text-xs text-muted-foreground">{t('{n} in the library', { n: stage.total })}</p>
        </div>
      </div>

      {stage.note ? (
        <p className="mx-4 mb-4 rounded-lg border-l-2 border-primary bg-muted/40 px-3 py-2 text-sm leading-6 text-pretty whitespace-pre-line sm:mx-5">
          <span className="font-medium">{t('From your teacher')}: </span>
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
function TaskRow({ task, t }: { task: PathTask; t: Translate }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      prefetch={false}
      className={cn('group flex items-center gap-3 px-4 py-3 sm:px-5', 'transition-colors hover:bg-white/[0.04]')}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{task.title}</span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <DifficultyStars level={task.difficulty} />
          {t(difficultyLabel(task.difficulty))}
          {task.estimatedMinutes ? (
            <>
              <Clock className="size-3" />
              {t('{n} min', { n: task.estimatedMinutes })}
            </>
          ) : null}
          {task.attempts > 0 ? `· ${t('{n} {n|attempt|attempts}', { n: task.attempts })}` : null}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  )
}

function Upcoming({ stage, t, locale }: { stage: PathStage; t: Translate; locale: Locale }) {
  return (
    <li className={cn(cardClass, 'flex items-center gap-3 p-3.5 opacity-70')}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Lock className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {t(stage.topic)}
        {stage.due ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {t('by {date}', { date: formatDay(stage.due, locale) })}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {t('{solved} of {target} solved', { solved: stage.solved, target: stage.target })}
      </span>
    </li>
  )
}

function Behind({ stage, t }: { stage: PathStage; t: Translate }) {
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
        {t(stage.topic)}
      </Link>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {t('{n} solved', { n: stage.solved })}
      </span>
    </li>
  )
}
