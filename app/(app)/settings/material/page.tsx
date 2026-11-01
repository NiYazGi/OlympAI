import { notFound } from 'next/navigation'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { MaterialForm, type ExistingResource } from '@/components/settings/material-form'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getReference } from '@/lib/supabase/reference'
import type { Licence } from '@/lib/licence'

export const metadata = { title: 'Add material' }
export const dynamic = 'force-dynamic'

export default async function MaterialPage() {
  const profile = await getCurrentProfile()
  // Not a redirect: an admin-only page should not advertise that it exists.
  if (!profile?.is_admin) notFound()

  const reference = await getReference()
  const supabase = await createClient()
  const [{ data: topicRows }, { data: resourceRows }] = await Promise.all([
    supabase.from('topics').select('id, name, subject_id').order('name'),
    supabase
      .from('resources')
      .select('id, kind, title, url, licence, task_id, topic_id')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const topicName = new Map((topicRows ?? []).map((row) => [row.id, row.name]))
  const taskTitle = new Map(reference.tasks.map((task) => [task.id, task.title]))

  const tasks = reference.tasks
    .map((task) => ({
      id: task.id,
      label: task.title,
      group: reference.subjectById[task.subject_id] ?? 'Other',
    }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label))

  const topics = (topicRows ?? [])
    .map((row) => ({
      id: row.id,
      label: row.name,
      group: reference.subjectById[row.subject_id] ?? 'Other',
    }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label))

  const existing: ExistingResource[] = (resourceRows ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    url: row.url,
    licence: row.licence as Licence,
    attachedTo: row.task_id
      ? (taskTitle.get(row.task_id) ?? 'a task')
      : `${topicName.get(row.topic_id ?? '') ?? 'a topic'} (whole topic)`,
  }))

  return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
        <BackLink href="/settings">Settings</BackLink>

        <PageHeader
          title="Add material"
          description="Lectures and readings for a task or a whole topic. Nothing is saved without a recorded licence."
        />

        <MaterialForm tasks={tasks} topics={topics} existing={existing} />
      </div>
  )
}
