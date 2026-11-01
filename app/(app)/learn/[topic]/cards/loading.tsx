import {
  BackLinkSkeleton,
  CardDeckSkeleton,
  HeaderSkeleton,
  RouteSkeleton,
} from '@/components/skeletons'
import { getT } from '@/lib/i18n'

export default async function CardsLoading() {
  const t = await getT()

  return (
    <RouteSkeleton width="max-w-2xl" label={t.cards.loading}>
      <BackLinkSkeleton />
      <HeaderSkeleton title="Recall" note />
      <CardDeckSkeleton />
    </RouteSkeleton>
  )
}
