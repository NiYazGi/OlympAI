import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { getT } from '@/lib/i18n/server'

/**
 * A problem that is gone or hidden. Without its own boundary the page kept
 * its loading skeleton on screen, which read as "still loading" forever.
 */
export default async function TaskNotFound() {
  const t = await getT()
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 p-8 py-20 text-center">
      <SearchX className="size-8 text-smoke" />
      <h1 className="text-2xl font-normal text-foreground">{t('This problem is not available.')}</h1>
      <p className="text-sm text-ash">{t('It may have been removed or hidden while it is being fixed. Plenty of others are waiting.')}</p>
      <Link
        href="/tasks?list=1"
        prefetch
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t('Browse tasks')}
      </Link>
    </div>
  )
}
