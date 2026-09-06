import { Suspense } from 'react'
import Link from 'next/link'
import { ClipboardCheck, Clock, Timer } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { StartMock } from '@/components/mock/start-mock'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { getGoal, getMockHistory, getSubjectSummary } from '@/lib/supabase/queries'
import { cardClass, cn } from '@/lib/utils'

export const metadata = { title: 'Mock tests' }

export default function MockPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader
        title="Mock tests"
        description="A timed paper with no hints and no Sulu — the closest thing here to sitting the real thing."
      />
      <Suspense
        fallback={
          <>
            <PendingRegion label="Loading your mock tests" />
            <BlockSkeleton className={`${cardClass} h-40`} />
          </>
        }
      >
        <MockList />
      </Suspense>
    </div>
  )
}

async function MockList() {
  const [history, subjects, goal] = await Promise.all([
    getMockHistory(),
    getSubjectSummary(),
    getGoal(),
  ])

  const open = history.find((entry) => !entry.submittedAt) ?? null
  const done = history.filter((entry) => entry.submittedAt)
  // Three tasks is the floor below which a score says nothing.
  const eligible = subjects.filter((subject) => subject.taskCount >= 3)

  if (eligible.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Not enough tasks for a mock yet"
        body="A subject needs at least three tasks before a paper can measure anything."
        action={{ href: '/tasks', label: 'Browse tasks' }}
      />
    )
  }

  return (
    <>
      {open ? (
        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-amber-500">
                In progress
              </p>
              <h2 className="mt-1 text-lg font-semibold">{open.subject} mock</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {open.taskCount} questions · {open.durationMinutes} minutes
              </p>
            </div>
            <Link
              href={`/mock/${open.id}`}
              prefetch
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Resume
            </Link>
          </div>
        </section>
      ) : (
        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <h2 className="font-semibold">Take a paper</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Five questions spanning the difficulty range, timed. Your answers are graded together
            at the end and the result sets the level on your profile — replacing the one you
            guessed at during setup.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {eligible.map((subject) => (
              <StartMock
                key={subject.id}
                subject={subject.name}
                label={
                  goal.subjectName === subject.name ? `${subject.name} (your target)` : subject.name
                }
              />
            ))}
          </div>
        </section>
      )}

      {done.length ? (
        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <h2 className="font-semibold">Past papers</h2>
          <ul className="mt-4 space-y-2">
            {done.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/mock/${entry.id}`}
                  prefetch
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{entry.subject}</span>
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
          No papers yet. The first one takes about an hour.
        </p>
      )}
    </>
  )
}
