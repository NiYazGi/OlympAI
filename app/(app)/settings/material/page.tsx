import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { MaterialForm, type ExistingResource } from '@/components/settings/material-form'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getReference } from '@/lib/supabase/reference'
import type { Licence } from '@/lib/licence'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Add material') }
}
export const dynamic = 'force-dynamic'

export default async function MaterialPage() {
  const t = await getT()

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
      group: t(reference.subjectById[task.subject_id] ?? 'Other'),
    }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label))

  const topics = (topicRows ?? [])
    .map((row) => ({
      id: row.id,
      label: row.name,
      group: t(reference.subjectById[row.subject_id] ?? 'Other'),
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
      : t('{topic} (whole topic)', { topic: topicName.get(row.topic_id ?? '') ?? t('a topic') }),
  }))

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href="/settings"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('Settings')}
      </Link>

      <PageHeader
        title={t('Add material')}
        description={t('Lectures and readings for a task or a whole topic. Nothing is saved without a recorded licence.')}
      />

      <MaterialForm tasks={tasks} topics={topics} existing={existing} />
    </div>
  )
}
