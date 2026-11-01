import { BackLinkSkeleton, ListSkeleton, RouteSkeleton, HeaderSkeleton } from '@/components/skeletons'
import { getT } from '@/lib/i18n'

export default async function MethodLoading() {
  const t = await getT()

  return (
    <RouteSkeleton width="max-w-3xl" label={t.method.loading}>
      <BackLinkSkeleton label={{ href: '/dashboard', text: t.nav.dashboard }} />
      <HeaderSkeleton title={t.method.title} />
      <ListSkeleton rows={8} />
    </RouteSkeleton>
  )
}
