'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { FigureSpec, ForcesSpec, MatrixSpec, PlotSpec, Point, Tone } from '@/lib/figures'
import { cardClass, cn } from '@/lib/utils'

/**
 * Figures, drawn from stored parameters.
 *
 * Nothing here reads markup out of the database — see the note at the top of
 * lib/figures.ts. Every renderer below takes typed numbers and strings and
 * produces its own elements, which is what makes an authored figure safe to
 * ship and cheap to serve.
 *
 * The drawing order is the teaching. Axes first, then the curves in the order
 * they were reasoned about, then the labels: a diagram that appears all at once
 * cannot show which part came first, and on a whiteboard that sequence is half
 * of the explanation.
 */

const W = 420
const H = 270

const COLOUR: Record<Tone, string> = {
  primary: 'var(--primary)',
  accent: 'var(--chart-2)',
  muted: 'var(--muted-foreground)',
  warn: 'var(--chart-4)',
}
const colour = (tone: Tone | undefined) => COLOUR[tone ?? 'primary']

/** Each element waits its turn. Index in, seconds out. */
const beat = (index: number) => ({ animationDelay: `${(index * 0.22).toFixed(2)}s` })

export function Figure({ spec }: { spec: FigureSpec }) {
  // Remounting is the whole replay mechanism: CSS animations restart when the
  // elements do, and there is no state worth preserving across a redraw.
  const [take, setTake] = useState(0)

  return (
    <figure className={cn(cardClass, 'overflow-hidden')}>
      <div key={take} className="bg-muted/40 px-3 py-4">
        {spec.kind === 'plot' ? <Plot spec={spec} /> : null}
        {spec.kind === 'forces' ? <Forces spec={spec} /> : null}
        {spec.kind === 'matrix' ? <Matrix spec={spec} /> : null}
      </div>

      <figcaption className="flex flex-wrap items-start justify-between gap-3 border-t border-foreground/10 p-3 sm:px-4">
        <span className="min-w-0 flex-1 text-sm leading-6 text-pretty text-muted-foreground">
          {spec.caption}
        </span>
        <button
          type="button"
          onClick={() => setTake((n) => n + 1)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="size-3" />
          Draw again
        </button>
      </figcaption>
    </figure>
  )
}

// ----------------------------------------------------------------- plot ---

function Plot({ spec }: { spec: PlotSpec }) {
  const pad = { left: 44, right: 18, top: 18, bottom: 34 }
  const width = W - pad.left - pad.right
  const height = H - pad.top - pad.bottom

  const [x0, x1] = spec.xRange
  const [y0, y1] = spec.yRange
  const sx = (x: number) => pad.left + ((x - x0) / (x1 - x0)) * width
  const sy = (y: number) => pad.top + height - ((y - y0) / (y1 - y0)) * height
  const path = (pts: Point[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ')

  let step = 0

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${spec.caption}. Horizontal axis ${spec.xLabel}, vertical axis ${spec.yLabel}.`}
    >
      {/* Axes, drawn first and together — they are the frame, not a step. */}
      <path
        d={`M ${pad.left} ${pad.top} L ${pad.left} ${pad.top + height} L ${pad.left + width} ${pad.top + height}`}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1.5}
        strokeLinecap="round"
        pathLength={1}
        className="wb-stroke"
        style={beat(step++)}
      />
      <text
        x={pad.left + width}
        y={pad.top + height + 22}
        textAnchor="end"
        className="wb-appear fill-muted-foreground text-[11px]"
        style={beat(step)}
      >
        {spec.xLabel}
      </text>
      {/* Rotating by -90 swaps the axes: a point (x, y) here lands at (y, -x)
          on screen, so the vertical centre of the plot is a negative x. */}
      <text
        x={-(pad.top + height / 2)}
        y={13}
        transform="rotate(-90)"
        textAnchor="middle"
        className="wb-appear fill-muted-foreground text-[11px]"
        style={beat(step++)}
      >
        {spec.yLabel}
      </text>

      {spec.areas.map((area, index) => (
        <g key={`area-${index}`}>
          <polygon
            points={area.points.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')}
            fill={colour(area.tone)}
            fillOpacity={0.16}
            stroke="none"
            className="wb-appear"
            style={beat(step++)}
          />
          {area.label ? (
            <text
              x={area.points.reduce((sum, p) => sum + sx(p.x), 0) / area.points.length}
              y={area.points.reduce((sum, p) => sum + sy(p.y), 0) / area.points.length}
              textAnchor="middle"
              className="wb-appear text-[10px] font-medium"
              fill={colour(area.tone)}
              style={beat(step)}
            >
              {area.label}
            </text>
          ) : null}
        </g>
      ))}

      {spec.lines.map((line, index) => (
        <g key={`line-${index}`}>
          <path
            d={path(line.points)}
            fill="none"
            stroke={colour(line.tone)}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={line.dashed ? '4 4' : undefined}
            pathLength={line.dashed ? undefined : 1}
            className={line.dashed ? 'wb-appear' : 'wb-stroke'}
            style={beat(step++)}
          />
          {line.label ? (
            <text
              x={sx(line.points[line.points.length - 1]!.x) - 4}
              y={sy(line.points[line.points.length - 1]!.y) - 6}
              textAnchor="end"
              className="wb-appear text-[11px] font-medium"
              fill={colour(line.tone)}
              style={beat(step)}
            >
              {line.label}
            </text>
          ) : null}
        </g>
      ))}

      {spec.marks.map((mark, index) => (
        <g key={`mark-${index}`} className="wb-appear" style={beat(step++)}>
          <circle cx={sx(mark.x)} cy={sy(mark.y)} r={3.5} fill={colour(mark.tone)} />
          {mark.label ? (
            <text
              x={sx(mark.x) + 7}
              y={sy(mark.y) - 7}
              className="text-[11px] font-medium"
              fill="var(--foreground)"
            >
              {mark.label}
            </text>
          ) : null}
        </g>
      ))}

      {spec.notes.map((note, index) => (
        <text
          key={`note-${index}`}
          x={sx(note.x)}
          y={sy(note.y)}
          textAnchor="middle"
          className="wb-appear fill-muted-foreground text-[10px]"
          style={beat(step++)}
        >
          {note.text}
        </text>
      ))}
    </svg>
  )
}

// --------------------------------------------------------------- forces ---

function Forces({ spec }: { spec: ForcesSpec }) {
  const cx = W / 2
  const cy = H / 2 - 6
  const rad = (spec.incline * Math.PI) / 180
  let step = 0

  // Ground runs through the body, tilted by the incline angle.
  const half = 150
  const ground = {
    x1: cx - half * Math.cos(rad),
    y1: cy + 30 + half * Math.sin(rad),
    x2: cx + half * Math.cos(rad),
    y2: cy + 30 - half * Math.sin(rad),
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${spec.caption}. Forces: ${spec.arrows.map((a) => a.label).join(', ')}.`}
    >
      <line
        x1={ground.x1}
        y1={ground.y1}
        x2={ground.x2}
        y2={ground.y2}
        stroke="var(--muted-foreground)"
        strokeWidth={1.5}
        strokeLinecap="round"
        pathLength={1}
        className="wb-stroke"
        style={beat(step++)}
      />

      {spec.body === 'disc' ? (
        <circle
          cx={cx}
          cy={cy}
          r={26}
          fill="var(--card)"
          stroke="var(--foreground)"
          strokeWidth={1.6}
          pathLength={1}
          className="wb-stroke"
          style={beat(step++)}
        />
      ) : (
        <rect
          x={cx - 28}
          y={cy - 20}
          width={56}
          height={40}
          rx={4}
          transform={`rotate(${-spec.incline} ${cx} ${cy})`}
          fill="var(--card)"
          stroke="var(--foreground)"
          strokeWidth={1.6}
          pathLength={1}
          className="wb-stroke"
          style={beat(step++)}
        />
      )}

      {spec.bodyLabel ? (
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          className="wb-appear fill-foreground text-[12px] font-medium"
          style={beat(step++)}
        >
          {spec.bodyLabel}
        </text>
      ) : null}

      {spec.arrows.map((arrow, index) => {
        const a = (arrow.angle * Math.PI) / 180
        const length = 62 * (arrow.length ?? 1)
        const dx = Math.cos(a)
        const dy = -Math.sin(a)
        const start = { x: cx + dx * 30, y: cy + dy * 26 }
        const end = { x: start.x + dx * length, y: start.y + dy * length }
        // Arrowhead: two short strokes swept back from the tip.
        const wing = (offset: number) => ({
          x: end.x - 9 * Math.cos(a - offset),
          y: end.y + 9 * Math.sin(a - offset),
        })
        const left = wing(0.45)
        const right = wing(-0.45)

        return (
          <g key={`arrow-${index}`}>
            <path
              d={`M ${start.x.toFixed(1)} ${start.y.toFixed(1)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)} M ${left.x.toFixed(1)} ${left.y.toFixed(1)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)} L ${right.x.toFixed(1)} ${right.y.toFixed(1)}`}
              fill="none"
              stroke={colour(arrow.tone)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              className="wb-stroke"
              style={beat(step++)}
            />
            <text
              x={end.x + dx * 12}
              y={end.y + dy * 12 + 4}
              textAnchor={dx > 0.2 ? 'start' : dx < -0.2 ? 'end' : 'middle'}
              className="wb-appear text-[11px] font-medium"
              fill={colour(arrow.tone)}
              style={beat(step)}
            >
              {arrow.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// --------------------------------------------------------------- matrix ---

function Matrix({ spec }: { spec: MatrixSpec }) {
  const left = 96
  const top = 62
  const cell = { w: 132, h: 74 }
  let step = 0

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${spec.caption}. ${spec.rowPlayer} chooses between ${spec.rowOptions.join(' and ')}; ${spec.colPlayer} chooses between ${spec.colOptions.join(' and ')}.`}
    >
      <text x={left} y={22} className="wb-appear fill-muted-foreground text-[11px]" style={beat(step)}>
        {spec.colPlayer}
      </text>
      <text
        x={-(top + cell.h)}
        y={13}
        transform="rotate(-90)"
        textAnchor="middle"
        className="wb-appear fill-muted-foreground text-[11px]"
        style={beat(step++)}
      >
        {spec.rowPlayer}
      </text>

      {spec.colOptions.map((option, index) => (
        <text
          key={`col-${option}`}
          x={left + cell.w * index + cell.w / 2}
          y={top - 10}
          textAnchor="middle"
          className="wb-appear fill-foreground text-[11px] font-medium"
          style={beat(step)}
        >
          {option}
        </text>
      ))}
      {spec.rowOptions.map((option, index) => (
        <text
          key={`row-${option}`}
          x={left - 10}
          y={top + cell.h * index + cell.h / 2 + 4}
          textAnchor="end"
          className="wb-appear fill-foreground text-[11px] font-medium"
          style={beat(step)}
        >
          {option}
        </text>
      ))}

      <path
        d={`M ${left} ${top} h ${cell.w * 2} v ${cell.h * 2} h ${-cell.w * 2} Z M ${left + cell.w} ${top} v ${cell.h * 2} M ${left} ${top + cell.h} h ${cell.w * 2}`}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1.4}
        strokeLinejoin="round"
        pathLength={1}
        className="wb-stroke"
        style={beat(step++)}
      />

      {spec.cells.map((row, rowIndex) =>
        row.map((payoff, colIndex) => {
          const highlighted =
            spec.highlight?.[0] === rowIndex && spec.highlight?.[1] === colIndex
          return (
            <g key={`cell-${rowIndex}-${colIndex}`}>
              {highlighted ? (
                <rect
                  x={left + cell.w * colIndex + 4}
                  y={top + cell.h * rowIndex + 4}
                  width={cell.w - 8}
                  height={cell.h - 8}
                  rx={6}
                  fill="var(--primary)"
                  fillOpacity={0.12}
                  stroke="var(--primary)"
                  strokeWidth={1.4}
                  pathLength={1}
                  className="wb-stroke"
                  style={beat(step)}
                />
              ) : null}
              <text
                x={left + cell.w * colIndex + cell.w / 2}
                y={top + cell.h * rowIndex + cell.h / 2 + 5}
                textAnchor="middle"
                className={cn(
                  'wb-appear text-[13px] tabular-nums',
                  highlighted ? 'font-semibold' : '',
                )}
                fill={highlighted ? 'var(--primary)' : 'var(--foreground)'}
                style={beat(step++)}
              >
                {payoff}
              </text>
            </g>
          )
        }),
      )}
    </svg>
  )
}
