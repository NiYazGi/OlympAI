import {
  BackLinkSkeleton,
  HeaderSkeleton,
  PaperSkeleton,
  RouteSkeleton,
} from '@/components/skeletons'

export default function MockPaperLoading() {
  return (
    <RouteSkeleton width="max-w-4xl" label="Loading the paper">
      <BackLinkSkeleton label={{ href: '/mock', text: 'All mock tests' }} />
      <HeaderSkeleton titleWidth="w-52" />
      <PaperSkeleton />
    </RouteSkeleton>
  )
}
