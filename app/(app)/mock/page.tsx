import { Reveal } from '@/components/reveal'
import Link from 'next/link'
import { ClipboardCheck, Clock, Timer } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { StartMock } from '@/components/mock/start-mock'
import { StartPaper } from '@/components/mock/start-paper'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { getGoal, getMockHistory, getSubjectSummary, getTaskCatalogue } from '@/lib/supabase/queries'
import { realPapers } from '@/lib/mock'
import { getT } from '@/lib/i18n'
import { cardClass, cn } from '@/lib/utils'

export async function generateMetadata() {
  const t = await getT()
  return { title: t.mock.title }
}

export default async function MockPage() {
  const t = await getT()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader title={t.mock.title} description={t.mock.description} />
      <Reveal
        fallback={
          <>
            <PendingRegion label={t.mock.loading} />
            <BlockSkeleton className={`${cardClass} h-40`} />
          </>
        }
      >
        <MockList />
      </Reveal>
    </div>
  )
}

async function MockList() {
  const [history, subjects, goal, tasks, t] = await Promise.all([
    getMockHistory(),
    getSubjectSummary(),
    getGoal(),
    getTaskCatalogue(),
    getT(),
  ])

  // Real sittings, narrowed to what the student is training for. Showing a
  // physics paper to someone preparing in mathematics is the same mistake the
  // catalogue made before it learned about targets.
  const papers = realPapers(
    goal.subjectName ? tasks.filter((task) => task.subject === goal.subjectName) : tasks,
  )

  const open = history.find((entry) => !entry.submittedAt) ?? null
  const done = history.filter((entry) => entry.submittedAt)
  // Three tasks is the floor below which a score says nothing.
  const eligible = subjects.filter((subject) => subject.taskCount >= 3)
  const short = subjects.filter((subject) => subject.taskCount < 3)

  if (eligible.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t.mock.emptyTitle}
        body={t.mock.emptyBody}
        action={{ href: '/tasks', label: t.mock.browseTasks }}
      />
    )
  }

  return (
    <>
      {open ? (
        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-caption font-semibold text-warning">
                {t.mock.inProgress}
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {t.mock.subjectMock(t.subjects[open.subject] ?? open.subject)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.mock.questionsMinutes(open.taskCount, open.durationMinutes)}
              </p>
            </div>
            <Link
              href={`/mock/${open.id}`}
              prefetch
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t.mock.resume}
            </Link>
          </div>
        </section>
      ) : (
        <>
        {papers.length ? (
          <section className="space-y-3">
            <div>
              <h2 className="font-semibold">{t.mock.realPapers}</h2>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {t.mock.realPapersNote}
              </p>
            </div>
            <ul className="grid gap-2">
              {papers.map((paper) => (
                <StartPaper key={paper.paper} paper={paper} />
              ))}
            </ul>
          </section>
        ) : null}

        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <h2 className="font-semibold">{papers.length ? t.mock.composed : t.mock.takeAPaper}</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t.mock.takeNote}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {eligible.map((subject) => (
              <StartMock
                key={subject.id}
                subject={subject.name}
                label={
                  // A subject with four problems produces a four-question paper.
                  // Saying "five" and handing over three is a promise broken on
                  // the one screen where the count is the whole point.
                  t.mock.startLabel(
                    t.subjects[subject.name] ?? subject.name,
                    goal.subjectName === subject.name,
                    Math.min(5, subject.taskCount),
                  )
                }
              />
            ))}
          </div>

          {/*
            The subjects that cannot produce a paper used to be absent with no
            explanation, so a student whose target was Economics saw three
            buttons, none of them theirs, and no reason given. /learn explained
            it; this page did not.
          */}
          {short.length ? (
            <div className="mt-5 border-t border-foreground/10 pt-4">
              <p className="text-sm text-muted-foreground">
                {t.mock.shortNote}
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {short.map((subject) => (
                  <li key={subject.id} className="text-sm text-muted-foreground">
                    <span className={cn(goal.subjectName === subject.name && 'font-medium text-foreground')}>
                      {t.subjects[subject.name] ?? subject.name}
                    </span>{' '}
                    <span className="tabular-nums">{t.mock.shortCount(subject.taskCount)}</span>
                    {goal.subjectName === subject.name ? ` — ${t.mock.yourTarget}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
        </>
      )}

      {done.length ? (
        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <h2 className="font-semibold">{t.mock.pastPapers}</h2>
          <ul className="mt-4 space-y-2">
            {done.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/mock/${entry.id}`}
                  prefetch
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {t.subjects[entry.subject] ?? entry.subject}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {new Date(entry.startedAt).toLocaleDateString('en', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      · {entry.level}
                    </span>
                  </span>
                  <span className="shrink-0 text-lg font-semibold tabular-nums text-primary">
                    {entry.scorePercent}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="size-4" />
          {t.mock.noPapers}
        </p>
      )}
    </>
  )
}
