import { Reveal } from '@/components/reveal'
import { PageHeader } from '@/components/page-header'
import { ProblemBank } from '@/components/problems/problem-bank'
import { NextActionCard, ScopeNote } from '@/components/learn/next-action-card'
import { ListSkeleton, PendingRegion } from '@/components/skeletons'
import { getGoal, getTaskCatalogue } from '@/lib/supabase/queries'
import { getNextAction } from '@/lib/supabase/study'

export const metadata = { title: 'Problems' }
export const dynamic = 'force-dynamic'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string; topic?: string }>
}) {
  const { all, topic } = await searchParams

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-5 sm:space-y-6 sm:p-8">
      <PageHeader
        title="Problems"
        description="The last step of every topic: write the full derivation and Sulu grades the reasoning."
      />
      <Reveal
        fallback={
          <>
            <PendingRegion label="Loading the problems" />
            <ListSkeleton rows={5} />
          </>
        }
      >
        <Catalogue showAll={all === '1'} topic={topic ?? null} />
      </Reveal>
    </div>
  )
}

async function Catalogue({ showAll, topic }: { showAll: boolean; topic: string | null }) {
  const [tasks, goal, action] = await Promise.all([
    getTaskCatalogue(),
    getGoal(),
    getNextAction(),
  ])

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
      <NextActionCard action={action} />

      <ScopeNote
        subject={goal.subjectName}
        scoped={scoped}
        hidden={subjects.size - 1}
        allHref="/tasks?all=1"
        focusHref="/tasks"
      />

      <ProblemBank tasks={visible} />
    </>
  )
}
