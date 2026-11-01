import { Reveal } from '@/components/reveal'
import { Trophy } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { OlympiadBrowser } from '@/components/competitions/olympiad-browser'
import { EmptyState } from '@/components/empty-state'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { getCompetitions } from '@/lib/supabase/competitions'
import { getT } from '@/lib/i18n'
import { cardClass } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t.olympiads.title }
}

export default async function OlympiadsPage() {
  const t = await getT()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader title={t.olympiads.title} description={t.olympiads.description} />
      <Reveal
        fallback={
          <>
            <PendingRegion label={t.olympiads.loading} />
            <BlockSkeleton className={`${cardClass} h-10`} />
            <div className="grid gap-3 md:grid-cols-2">
              <BlockSkeleton className={`${cardClass} h-44`} />
              <BlockSkeleton className={`${cardClass} h-44`} />
              <BlockSkeleton className={`${cardClass} h-44`} />
              <BlockSkeleton className={`${cardClass} h-44`} />
            </div>
          </>
        }
      >
        <Competitions />
      </Reveal>
    </div>
  )
}

async function Competitions() {
  const [competitions, t] = await Promise.all([getCompetitions(), getT()])

  if (competitions.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title={t.olympiads.emptyTitle}
        body={t.olympiads.emptyBody}
        action={{ href: '/tasks', label: t.olympiads.emptyAction }}
      />
    )
  }

  return (
    <>
      <OlympiadBrowser competitions={competitions} />
      {/* Said once, at the bottom, rather than on every card: the reason there
          are no dates anywhere on this page. */}
      <p className="text-sm leading-6 text-pretty text-muted-foreground">{t.olympiads.datesNote}</p>
    </>
  )
}
