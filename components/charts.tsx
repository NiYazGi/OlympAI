'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { AXIS_MAX, DAY_TARGET } from '@/lib/day-state'

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

const skillsConfig = {
  mastery: { label: 'Mastery %', color: 'var(--chart-1)' },
} satisfies ChartConfig

/** Eight axes is the most a radar can carry before the labels collide. */
const MAX_AXES = 8
/** Longer than this and the label runs off its corner of the chart. */
const MAX_LABEL = 12

/**
 * Mastery per topic, as one shape.
 *
 * A row of bars answers "how am I doing at X" one topic at a time; the point
 * of the subject is the shape they make together — where the outline caves in
 * is where the next session goes. Ordered so neighbouring axes are topics the
 * student meets in order, not by score, because a ranking is what the list
 * underneath is for.
 *
 * It needs three axes to be a shape at all; with fewer, the caller shows the
 * bars instead.
 */
export function SkillsRadarChart({
  data,
  height = 'h-72',
}: {
  data: { topic: string; mastery: number }[]
  height?: string
}) {
  const axes = data.slice(0, MAX_AXES)

  return (
    <ChartContainer config={skillsConfig} className={`${height} w-full`}>
      <RadarChart data={axes} outerRadius="64%" margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="topic"
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickFormatter={(value: string) =>
            value.length > MAX_LABEL ? `${value.slice(0, MAX_LABEL - 1)}…` : value
          }
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Radar
          dataKey="mastery"
          stroke="var(--color-mastery)"
          strokeWidth={2}
          fill="var(--color-mastery)"
          fillOpacity={0.18}
          dot={{ r: 2.5, fill: 'var(--color-mastery)', strokeWidth: 0 }}
        />
      </RadarChart>
    </ChartContainer>
  )
}

const dayConfig = {
  score: { label: 'Today', color: 'var(--chart-1)' },
  even: { label: 'Bar, spread evenly', color: 'var(--muted-foreground)' },
} satisfies ChartConfig

/** What each axis would be worth if the bar were cleared evenly across five. */
const EVEN = DAY_TARGET / 5

/**
 * The day's five axes, with the bar drawn behind them.
 *
 * The dashed pentagon is not a target for each axis — the bar is a total, and
 * a day that sleeps badly and reads for six hours clears it too. It is there
 * so the filled shape can be read at a glance as bigger or smaller than the
 * thing it has to beat, which a number alone does not do.
 */
export function DayStateRadar({
  data,
  height = 'h-60',
}: {
  data: { axis: string; score: number }[]
  height?: string
}) {
  const shaped = data.map((entry) => ({ ...entry, even: EVEN }))

  return (
    <ChartContainer config={dayConfig} className={`${height} w-full`}>
      <RadarChart data={shaped} outerRadius="62%" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <PolarGrid stroke="var(--border)" />
        {/* The shape has to leave room for its own labels. At 74% the outline
            filled the box and "Загруженность" came out as "...нность": a chart
            drawn at the width of its data rather than the width of the thing
            it has to be read with. */}
        {/* No truncation here, unlike the skills radar: these five labels are
            fixed and known, so the chart is given room for the longest of them
            instead of the longest being cut to fit. */}
        <PolarAngleAxis dataKey="axis" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, AXIS_MAX]} tick={false} axisLine={false} />
        <Radar
          dataKey="even"
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray="4 4"
          fill="none"
          isAnimationActive={false}
        />
        <Radar
          dataKey="score"
          stroke="var(--color-score)"
          strokeWidth={2}
          fill="var(--color-score)"
          fillOpacity={0.2}
          dot={{ r: 2.5, fill: 'var(--color-score)', strokeWidth: 0 }}
        />
      </RadarChart>
    </ChartContainer>
  )
}
