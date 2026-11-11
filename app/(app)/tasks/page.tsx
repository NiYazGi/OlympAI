import Link from 'next/link'
import { ArrowLeft, BookmarkCheck, Flag } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { EmptyState } from '@/components/empty-state'
import { Track } from '@/components/problems/track'
import { buildPath } from '@/lib/path'
import { getStudentTrack } from '@/lib/supabase/track'
import { PageHeader } from '@/components/page-header'
import { ProblemBank } from '@/components/problems/problem-bank'
import { NextActionCard, ScopeNote } from '@/components/learn/next-action-card'
import { ListSkeleton, PendingRegion } from '@/components/skeletons'
import { getGoal, getSavedTaskIds, getTaskCatalogue } from '@/lib/supabase/queries'
import { getNextAction } from '@/lib/supabase/study'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Problems') }
}
export const dynamic = 'force-dynamic'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string; topic?: string; list?: string }>
}) {
  const t = await getT()

  const [{ all, topic, list }, savedIds] = await Promise.all([searchParams, getSavedTaskIds()])
  // Two views of the same problems. The track opens — the section the student
  // is on and what it asks for, in order; the whole catalogue with filters is
  // ?list=1, because "what is there" and "what now" are different questions.
  const catalogue = list === '1' || all === '1' || Boolean(topic)

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-5 sm:space-y-6 sm:p-8">
      <PageHeader
        title={t('Problems')}
        description={
          catalogue
            ? t('Every problem in the subject, filterable. Looking something up here does not change what the track says to do next.')
            : t('The last step of every topic: write the full derivation and Sulu grades the reasoning.')
        }
      >
        {savedIds.length ? (
          <Link
            href="/tasks?list=1&all=1&saved=1"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm transition-colors hover:bg-secondary"
          >
            <BookmarkCheck className="size-4 text-coral" />
            {t('Saved: {n}', { n: savedIds.length })}
          </Link>
        ) : null}
      </PageHeader>
      <Reveal
        fallback={
          <>
            <PendingRegion label={t('Loading the problems')} />
            <ListSkeleton rows={5} />
          </>
        }
      >
        {catalogue ? <Catalogue showAll={all === '1'} topic={topic ?? null} /> : <TrackView />}
      </Reveal>
    </div>
  )
}

async function TrackView() {
  const [tasks, goal, action, student, t] = await Promise.all([
    getTaskCatalogue(),
    getGoal(),
    getNextAction(),
    getStudentTrack(),
    getT(),
  ])

  if (!goal.subjectName) {
    return (
      <EmptyState
        icon={Flag}
        title={t('Choose what you are training for')}
        body={t('The track runs through one subject. Pick yours and it lays itself out.')}
        action={{ href: '/learn', label: t('Choose a subject') }}
      />
    )
  }

  const path = buildPath(tasks, goal.subjectName, student.track)
  if (path.stages.length === 0) {
    return (
      <EmptyState
        icon={Flag}
        title={t('Nothing has been written for this subject yet')}
        body={t('The track asks for a number of problems per section; this subject has none yet.')}
        action={{ href: '/tasks?list=1', label: t('Whole catalogue') }}
      />
    )
  }

  return (
    <>
      <NextActionCard action={action} />
      <Track path={path} from={student.from} />
    </>
  )
}

async function Catalogue({ showAll, topic }: { showAll: boolean; topic: string | null }) {
  const [tasks, goal, t] = await Promise.all([getTaskCatalogue(), getGoal(), getT()])

  // Same narrowing as /learn, from the same source of truth, so the two pages
  // never disagree about what the student is training for.
  const subjects = new Set(tasks.map((task) => task.subject))
  const inGoal = (task: (typeof tasks)[number]) => task.subject === goal.subjectName

  // A ?topic= that the narrowing would hide widens the page instead of landing
  // the student on a filter with nothing behind it. It happens when the link
  // came from a topic outside the target subject.
  const topicIsOutside = Boolean(topic) && !tasks.some((task) => inGoal(task) && task.topic === topic)

  const scoped =
    !showAll && !topicIsOutside && Boolean(goal.subjectName) && tasks.some(inGoal)
  const visible = scoped ? tasks.filter(inGoal) : tasks

  return (
    <>
      <Link
        href="/tasks"
        prefetch
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t('Back to the track')}
      </Link>

      <ScopeNote
        subject={goal.subjectName}
        scoped={scoped}
        hidden={subjects.size - 1}
        allHref="/tasks?all=1"
        focusHref="/tasks?list=1"
      />

      <ProblemBank tasks={visible} />
    </>
  )
}
