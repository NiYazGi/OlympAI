import 'server-only'
import { cache } from 'react'
import { getTaskCatalogue } from '@/lib/supabase/queries'
import { getReference } from '@/lib/supabase/reference'
import { analysedTaskTopic } from '@/lib/competition-analysis'

export const getAnalysedTaskCatalogue = cache(async () => {
  const [tasks, reference] = await Promise.all([getTaskCatalogue(), getReference()])
  const statements = new Map(reference.tasks.map((task) => [task.id, task.problem]))
  return tasks.map((task) => ({
    ...task, topic: analysedTaskTopic({ ...task, problem: statements.get(task.id) ?? '' }),
  }))
})
