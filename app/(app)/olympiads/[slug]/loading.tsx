import { BlockSkeleton, HeaderSkeleton, PendingRegion } from '@/components/skeletons'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export default async function OlympiadLoading() {
  const t = await getT()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PendingRegion label={t('Loading competitions')} />
      <HeaderSkeleton />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <BlockSkeleton key={index} className={cn(cardClass, 'h-20')} />
        ))}
      </div>
      <BlockSkeleton className={cn(cardClass, 'h-48')} />
    </div>
  )
}
