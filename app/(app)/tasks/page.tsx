import { Reveal } from '@/components/reveal'
import Link from 'next/link'
import { ArrowLeft, Flag } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { ProblemBank } from '@/components/problems/problem-bank'
import { Track } from '@/components/problems/track'
import { NextActionCard, ScopeNote } from '@/components/learn/next-action-card'
import { ListSkeleton, PendingRegion } from '@/components/skeletons'
import { buildPath } from '@/lib/path'
import { getGoal, getTaskCatalogue } from '@/lib/supabase/queries'
import { getNextAction } from '@/lib/supabase/study'
import { getStudentTrack } from '@/lib/supabase/track'
import { getT } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t.tasks.title }
}

/**
 * Two views of the same problems, and which one opens matters.
 *
 * The track opens: the section the student is on and the problems it asks for,
 * in the order to do them. The catalogue — every problem, with filters — is
 * `?list=1`, because "what is there" is a different question from "what now"
 * and only one of them is worth answering unprompted.
 */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string; topic?: string; list?: string }>
}) {
  const [{ all, topic, list }, t] = await Promise.all([searchParams, getT()])
  const catalogue = list === '1' || all === '1' || Boolean(topic)

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-5 sm:space-y-6 sm:p-8">
      <PageHeader
        title={t.tasks.title}
        description={catalogue ? t.route.catalogueNote : t.tasks.description}
      />
      <Reveal
        fallback={
          <>
            <PendingRegion label={t.tasks.loading} />
            <ListSkeleton rows={5} />
          </>
        }
      >
        {catalogue ? (
          <Catalogue showAll={all === '1'} topic={topic ?? null} />
        ) : (
          <TrackView />
        )}
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
        title={t.route.noTarget}
        body={t.route.noTargetBody}
        action={{ href: '/learn', label: t.route.chooseTarget }}
      />
    )
  }

  const path = buildPath(tasks, goal.subjectName, student.track)
  if (path.stages.length === 0) {
    return (
      <EmptyState
        icon={Flag}
        title={t.route.emptySubject}
        body={t.bank.emptyBody}
        action={{ href: '/tasks?list=1', label: t.route.openCatalogue }}
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

  const scoped = !showAll && !topicIsOutside && Boolean(goal.subjectName) && tasks.some(inGoal)
  const visible = scoped ? tasks.filter(inGoal) : tasks

  return (
    <>
      <Link
        href="/tasks"
        prefetch
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t.route.backToTrack}
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
