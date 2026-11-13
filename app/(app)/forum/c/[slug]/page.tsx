import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MessageSquarePlus } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { ThreadList } from '@/components/community/thread-list'
import { buttonVariants } from '@/components/ui/button'
import { getCategory, listThreads } from '@/lib/community'
import { isCurrentUserAdmin } from '@/lib/supabase/admin-guard'
import { getLocale, getT } from '@/lib/i18n/server'

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [t, locale, category, admin] = await Promise.all([getT(), getLocale(), getCategory(slug), isCurrentUserAdmin()])
  if (!category) notFound()
  const threads = await listThreads({ category: category.slug, limit: 60 })
  return (
    <>
      <BackLink href="/forum">{t('Forum')}</BackLink>
      <PageHeader title={t(category.name)} description={t(category.description)}>
        {!category.adminOnly || admin ? (
          <Link href={`/forum/new?category=${category.slug}`} className={buttonVariants()}>
            <MessageSquarePlus className="size-4" /> {t('New thread')}
          </Link>
        ) : null}
      </PageHeader>
      <ThreadList threads={threads} t={t} locale={locale} />
    </>
  )
}
