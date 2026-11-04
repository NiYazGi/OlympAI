import { BlockSkeleton, HeaderSkeleton, ListSkeleton, PendingRegion } from '@/components/skeletons'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export default async function PlanLoading() {
  const t = await getT()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PendingRegion label={t('Working out your plan')} />
      <HeaderSkeleton title={t('Your plan')} />
      <BlockSkeleton className={cn(cardClass, 'h-40')} />
      <ListSkeleton rows={4} />
    </div>
  )
}
