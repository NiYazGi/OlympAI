import { BlockSkeleton, HeaderSkeleton, ListSkeleton, RouteSkeleton } from '@/components/skeletons'
import { getT } from '@/lib/i18n'
import { cardClass, cn } from '@/lib/utils'

export default async function PlanLoading() {
  const t = await getT()

  return (
    <RouteSkeleton width="max-w-4xl" label={t.plan.loading}>
      <HeaderSkeleton title={t.plan.title} />
      <BlockSkeleton className={cn(cardClass, 'h-40')} />
      <ListSkeleton rows={4} />
    </RouteSkeleton>
  )
}
