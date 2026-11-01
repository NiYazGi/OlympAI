import {
  BackLinkSkeleton,
  HeaderSkeleton,
  RouteSkeleton,
  StageListSkeleton,
} from '@/components/skeletons'
import { getT } from '@/lib/i18n'

export default async function TopicLoading() {
  const t = await getT()

  return (
    <RouteSkeleton width="max-w-3xl" label={t.learn.loadingTopic}>
      <BackLinkSkeleton label={{ href: '/learn', text: t.learn.allTopics }} />
      <HeaderSkeleton note />
      <StageListSkeleton />
    </RouteSkeleton>
  )
}
