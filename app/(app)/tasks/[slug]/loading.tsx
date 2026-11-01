import {
  BackLinkSkeleton,
  HeaderSkeleton,
  RouteSkeleton,
  TaskSkeleton,
} from '@/components/skeletons'
import { getT } from '@/lib/i18n'

export default async function TaskLoading() {
  const t = await getT()

  return (
    <RouteSkeleton width="max-w-6xl" label={t.tasks.loadingOne}>
      <BackLinkSkeleton label={{ href: '/tasks', text: t.tasks.back }} />
      <HeaderSkeleton titleWidth="w-64" />
      <TaskSkeleton />
    </RouteSkeleton>
  )
}
