import {
  BackLinkSkeleton,
  HeaderSkeleton,
  LessonSkeleton,
  RouteSkeleton,
} from '@/components/skeletons'
import { getT } from '@/lib/i18n'

export default async function LessonLoading() {
  const t = await getT()

  return (
    <RouteSkeleton width="max-w-3xl" label={t.lesson.loading}>
      <BackLinkSkeleton />
      <HeaderSkeleton titleWidth="w-72" />
      <LessonSkeleton />
    </RouteSkeleton>
  )
}
