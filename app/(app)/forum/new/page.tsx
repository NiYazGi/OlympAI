import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { NewThreadForm } from '@/components/community/forum-client'
import { listCategories } from '@/lib/community'
import { getTaskDetail } from '@/lib/supabase/queries'
import { isCurrentUserAdmin } from '@/lib/supabase/admin-guard'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('New thread') }
}

const SUBJECT_SECTION: Record<string, string> = { Mathematics: 'mathematics', Physics: 'physics', Informatics: 'informatics' }

/** ?task=<id> links the thread to a problem; ?category= preselects the section. */
export default async function NewThreadPage({ searchParams }: { searchParams: Promise<{ category?: string; task?: string }> }) {
  const params = await searchParams
  const [t, categories, admin, task] = await Promise.all([
    getT(),
    listCategories(),
    isCurrentUserAdmin(),
    params.task ? getTaskDetail(params.task).catch(() => null) : Promise.resolve(null),
  ])
  const open = categories.filter((category) => admin || !category.adminOnly)
  const fromTask = task ? SUBJECT_SECTION[(task as { subject?: string }).subject ?? ''] : undefined
  const initial = open.find((category) => category.slug === (params.category ?? fromTask))?.slug ?? open.find((category) => !category.adminOnly)?.slug ?? open[0]?.slug ?? ''
  return (
    <>
      <BackLink href="/forum">{t('Forum')}</BackLink>
      <PageHeader title={t('New thread')} description={t('A clear title and the problem written out get answers faster.')} />
      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <NewThreadForm
          categories={open.map((category) => ({ slug: category.slug, name: category.name }))}
          initialCategory={initial}
          taskId={task ? (task as { id: string }).id : null}
          taskTitle={task ? (task as { title: string }).title : null}
        />
      </section>
    </>
  )
}
