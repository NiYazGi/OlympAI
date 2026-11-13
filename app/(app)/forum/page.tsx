import Link from 'next/link'
import { MessageSquarePlus, Search } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { ThreadList } from '@/components/community/thread-list'
import { buttonVariants } from '@/components/ui/button'
import { listCategories, listThreads, topMembers } from '@/lib/community'
import { ago } from '@/lib/admin/format'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn, fieldClass } from '@/lib/utils'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Forum') }
}

export default async function ForumPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const [t, locale, categories, threads, members] = await Promise.all([getT(), getLocale(), listCategories(), listThreads({ query: q, limit: 20 }), topMembers(8)])
  const names = new Map(categories.map((category) => [category.slug, category.name]))
  return (
    <>
      <PageHeader title={t('Forum')} description={t('Ask about a problem, share a solution, discuss olympiads. Formulas and code are rendered.')}>
        <Link href="/forum/new" className={buttonVariants()}>
          <MessageSquarePlus className="size-4" /> {t('New thread')}
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0 space-y-6">
          <form action="/forum" className="flex gap-2">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input name="q" defaultValue={q} placeholder={t('Search the forum')} className={cn(fieldClass, 'pl-9')} />
            </label>
          </form>

          {q ? null : (
            <section className="grid gap-3 sm:grid-cols-2">
              {categories.map((category) => (
                <Link key={category.slug} href={`/forum/c/${category.slug}`} className={cn(cardClass, 'lift p-4')}>
                  <p className="font-medium">{t(category.name)}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t(category.description)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('{n} {n|thread|threads}', { n: category.threads })}
                    {category.lastPostAt ? ` · ${ago(category.lastPostAt, t, locale)}` : ''}
                  </p>
                </Link>
              ))}
            </section>
          )}

          <section className="space-y-3">
            <h2 className="eyebrow">{q ? t('Found') : t('Latest')}</h2>
            <ThreadList threads={threads} t={t} locale={locale} categories={names} />
          </section>
        </div>

        <aside className="space-y-4">
          <section className={cn(cardClass, 'p-4')}>
            <h2 className="text-sm font-medium">{t('Most active')}</h2>
            {members.length ? (
              <ol className="mt-3 space-y-2 text-sm">
                {members.map((member, index) => (
                  <li key={member.username} className="flex items-center justify-between gap-2">
                    <Link href={`/u/${member.username}`} className="min-w-0 truncate hover:underline">
                      <span className="mr-1.5 font-mono text-xs text-muted-foreground">{index + 1}</span>
                      {member.full_name?.trim() || member.username}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{member.solved} ✓ · {member.awards} ★</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{t('Nobody yet.')}</p>
            )}
          </section>
          <Link href="/u/me" className={cn(cardClass, 'lift block p-4 text-sm')}>
            <span className="font-medium">{t('My profile and awards')}</span>
          </Link>
        </aside>
      </div>
    </>
  )
}
