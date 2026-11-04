'use client'

import dynamic from 'next/dynamic'

/**
 * The charts, loaded after the page is on screen. Recharts is the heaviest
 * library in the app and sat in the first load of both the dashboard and Me,
 * where the numbers above the charts are what people read first. A skeleton of
 * the same height holds the space, so nothing moves when they arrive.
 */
const placeholder = (height: string) =>
  function ChartPlaceholder() {
    return <div className={`${height} w-full animate-pulse rounded-lg bg-white/[0.03]`} />
  }

export const AccuracyTrendChart = dynamic(
  () => import('@/components/charts').then((mod) => mod.AccuracyTrendChart),
  { ssr: false, loading: placeholder('h-64') },
)

export const TopicBarChart = dynamic(
  () => import('@/components/charts').then((mod) => mod.TopicBarChart),
  { ssr: false, loading: placeholder('h-64') },
)

export const ActivityChart = dynamic(
  () => import('@/components/charts').then((mod) => mod.ActivityChart),
  { ssr: false, loading: placeholder('h-56') },
)
