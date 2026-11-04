import { Reveal } from '@/components/reveal'
import Link from 'next/link'
import { ClipboardCheck, Clock, Timer } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { StartMock } from '@/components/mock/start-mock'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import {
  getCurrentProfile,
  getGoal,
  getMockHistory,
  getSubjectSummary,
  getTaskCatalogue,
} from '@/lib/supabase/queries'
import { composeMockFor, realPapers } from '@/lib/mock'
import { PaperBrowser } from '@/components/mock/paper-browser'
import { cardClass, cn } from '@/lib/utils'
import { getLocale, getT } from '@/lib/i18n/server'
import { formatDate } from '@/lib/i18n/config'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Mock tests') }
}

export default async function MockPage() {
  const t = await getT()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader
        title={t('Mock tests')}
        description={t(
          'A timed paper with no hints and no Sulu — the closest thing here to sitting the real thing.',
        )}
      />
      <Reveal
        fallback={
          <>
            <PendingRegion label={t('Loading your mock tests')} />
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
  const t = await getT()
  const locale = await getLocale()

  const [history, subjects, goal, catalogue, profile] = await Promise.all([
    getMockHistory(),
    getSubjectSummary(),
    getGoal(),
    getTaskCatalogue(),
    getCurrentProfile(),
  ])

  // Real sittings, narrowed to what the student is training for.
  const papers = realPapers(
    goal.subjectName ? catalogue.filter((task) => task.subject === goal.subjectName) : catalogue,
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
        title={t('Not enough tasks for a mock yet')}
        body={t('A subject needs at least three tasks before a paper can measure anything.')}
        action={{ href: '/tasks', label: t('Browse tasks') }}
      />
    )
  }

  return (
    <>
      {open ? (
        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-warning">{t('In progress')}</p>
              <h2 className="mt-1 text-lg font-medium">
                {open.subject} {t('mock')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {open.taskCount} {t('questions ·')} {open.durationMinutes} {t('minutes')}
              </p>
            </div>
            <Link
              href={`/mock/${open.id}`}
              prefetch
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t('Resume')}
            </Link>
          </div>
        </section>
      ) : (
        <>
          {papers.length ? (
            <section className="space-y-3">
              <div>
                <h2 className="font-medium">{t('Past papers, as they were sat')}</h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {t(
                    'Whole sittings from the Kazakh olympiad: the problems that were set, in the order they were printed. Graded like any other paper.',
                  )}
                </p>
              </div>
              <PaperBrowser papers={papers} />
            </section>
          ) : null}
          <section className={cn(cardClass, 'p-5 sm:p-6')}>
            <h2 className="font-medium">
              {papers.length ? t('Or a paper put together for you') : t('Take a paper')}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {t(
                'Up to five questions spanning the difficulty range, timed. Your answers are graded together at the end and the result sets the level on your profile — replacing the one you guessed at during setup.',
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {eligible.map((subject) => {
                // The paper that would start, so the button states its real
                // length: a full paper can run past three hours, and the page
                // used to promise "about an hour".
                const paper = composeMockFor(catalogue, subject.name, profile?.grade)
                return (
                  <StartMock
                    key={subject.id}
                    subject={subject.name}
                    label={t('{name}{target} · {n} {n|question|questions} · {minutes} min', {
                      name: t(subject.name),
                      target: goal.subjectName === subject.name ? t(' (your target)') : '',
                      n: paper?.taskIds.length ?? Math.min(5, subject.taskCount),
                      minutes: paper?.durationMinutes ?? 0,
                    })}
                  />
                )
              })}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {t(
                'The clock starts when you press the button. You can leave and come back: answers are saved on this device as you type, and the paper is graded only when you submit it.',
              )}
            </p>

            {/*
            The subjects that cannot produce a paper used to be absent with no
            explanation, so a student whose target was Economics saw three
            buttons, none of them theirs, and no reason given. /learn explained
            it; this page did not.
          */}
            {short.length ? (
              <div className="mt-5 border-t border-foreground/10 pt-4">
                <p className="text-sm text-muted-foreground">
                  {t(
                    'Not enough problems for a paper yet — a subject needs three before a score means anything:',
                  )}
                </p>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {short.map((subject) => (
                    <li key={subject.id} className="text-sm text-muted-foreground">
                      <span
                        className={cn(goal.subjectName === subject.name && 'font-medium text-foreground')}
                      >
                        {subject.name}
                      </span>{' '}
                      <span className="tabular-nums">
                        ({subject.taskCount} {t('of 3)')}
                      </span>
                      {goal.subjectName === subject.name ? t(' — your target') : ''}
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
          <h2 className="font-medium">{t('Past papers')}</h2>
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
                      {formatDate(new Date(entry.startedAt), locale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      · {entry.level ? t(entry.level) : null}
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
          {t('No papers yet. The length of each paper is on its button.')}
        </p>
      )}
    </>
  )
}
