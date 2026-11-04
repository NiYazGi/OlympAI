import { BlockSkeleton, HeaderSkeleton, ListSkeleton } from '@/components/skeletons'
import { cardClass } from '@/lib/utils'

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <HeaderSkeleton />
      <ListSkeleton rows={2} />
      <BlockSkeleton className={`${cardClass} h-40`} />
    </div>
  )
}
