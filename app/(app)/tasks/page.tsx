import { Suspense } from 'react'
import { PageHeader } from '@/components/page-header'
import { ProblemBank } from '@/components/problems/problem-bank'
import { ListSkeleton, PendingRegion } from '@/components/skeletons'
import { getTaskCatalogue } from '@/lib/supabase/queries'

export const metadata = { title: 'Tasks' }

export default function TasksPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
      <PageHeader
        title="Task library"
        description="Pick a problem, write the full derivation, and Sulu grades the reasoning."
      />
      <Suspense
        fallback={
          <>
            <PendingRegion label="Loading the task library" />
            <ListSkeleton rows={5} />
          </>
        }
      >
        <Catalogue />
      </Suspense>
    </div>
  )
}

async function Catalogue() {
  const tasks = await getTaskCatalogue()
  return <ProblemBank tasks={tasks} />
}
