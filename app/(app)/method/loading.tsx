import { HeaderSkeleton, ListSkeleton, PendingRegion } from '@/components/skeletons'
import { getT } from '@/lib/i18n/server'

export default async function MethodLoading() {
  const t = await getT()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PendingRegion label={t('Loading the method')} />
      <HeaderSkeleton title={t('The method')} />
      <ListSkeleton rows={8} />
    </div>
  )
}
