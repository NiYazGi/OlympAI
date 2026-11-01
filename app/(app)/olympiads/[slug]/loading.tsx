import { BackLinkSkeleton, BlockSkeleton, HeaderSkeleton, RouteSkeleton } from '@/components/skeletons'
import { getT } from '@/lib/i18n'
import { cardClass, cn } from '@/lib/utils'

export default async function OlympiadLoading() {
  const t = await getT()

  return (
    <RouteSkeleton width="max-w-3xl" label={t.olympiads.loadingOne}>
      <BackLinkSkeleton label={{ href: '/olympiads', text: t.olympiads.back }} />
      <HeaderSkeleton />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <BlockSkeleton key={index} className={cn(cardClass, 'h-20')} />
        ))}
      </div>
      <BlockSkeleton className="h-24" />
      <BlockSkeleton className="h-24" />
    </RouteSkeleton>
  )
}
