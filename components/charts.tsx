'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const accuracyConfig = {
  accuracy: { label: 'Accuracy %', color: 'var(--chart-1)' },
} satisfies ChartConfig

/**
 * Accuracy per week, from real attempts. This replaces a "rating trajectory"
 * chart plotted from thirteen constants in lib/data.ts — the app has no rating
 * system, so there was nothing behind the line.
 */
export function AccuracyTrendChart({
  data,
  height = 'h-64',
}: {
  data: { label: string; accuracy: number }[]
  height?: string
}) {
  return (
    <ChartContainer config={accuracyConfig} className={`${height} w-full`}>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillAccuracy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accuracy)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--color-accuracy)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={24}
          className="text-xs"
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          width={40}
          className="text-xs"
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Area
          dataKey="accuracy"
          type="monotone"
          stroke="var(--color-accuracy)"
          strokeWidth={2.5}
          fill="url(#fillAccuracy)"
        />
      </AreaChart>
    </ChartContainer>
  )
}

const topicConfig = {
  accuracy: { label: 'Accuracy', color: 'var(--chart-1)' },
} satisfies ChartConfig

export function TopicBarChart({
  data,
}: {
  data: { topic: string; accuracy: number }[]
}) {
  return (
    <ChartContainer config={topicConfig} className="h-64 w-full">
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="topic"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          className="text-xs"
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          width={36}
          className="text-xs"
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="accuracy" fill="var(--color-accuracy)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

const activityConfig = {
  problems: { label: 'Problems', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function ActivityChart({
  data,
}: {
  data: { day: string; problems: number }[]
}) {
  return (
    <ChartContainer config={activityConfig} className="h-56 w-full">
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          className="text-xs"
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="problems" fill="var(--color-problems)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
