import {
  BackLinkSkeleton,
  HeaderSkeleton,
  QuizSkeleton,
  RouteSkeleton,
} from '@/components/skeletons'
import { getT } from '@/lib/i18n'

export default async function QuizLoading() {
  const t = await getT()

  return (
    <RouteSkeleton width="max-w-2xl" label={t.quiz.loading}>
      <BackLinkSkeleton />
      <HeaderSkeleton title="Check yourself" />
      <QuizSkeleton />
    </RouteSkeleton>
  )
}
