/**
 * Diagrams as data.
 *
 * The obvious way to give lessons pictures is to ask a model for one when the
 * page opens. That costs a call per view, forever, and every student sees a
 * slightly different drawing of the same idea — including, sooner or later, one
 * with the axis labelled wrongly. Nothing checks it, because nobody saw it.
 *
 * So a figure is stored as parameters, not as a picture. The model's job at
 * authoring time is to emit the small JSON below; the drawing is done by fixed
 * components in components/learn/figure.tsx. Three consequences follow:
 *
 *  - Serving a lesson costs nothing. The figure is a row, like the text.
 *  - A figure can be read and corrected before it ships, because it is a dozen
 *    numbers rather than three hundred lines of path data.
 *  - Nothing from the database becomes markup. Storing generated SVG and
 *    injecting it would be an XSS hole that a licence trigger cannot help with;
 *    a spec that only ever reaches a renderer as typed values cannot be one.
 *
 * The escape hatch, when a figure genuinely does not fit these shapes, is to
 * add a shape — not to loosen the rule.
 */

export const FIGURE_KINDS = ['plot', 'forces', 'matrix'] as const
export type FigureKind = (typeof FIGURE_KINDS)[number]

export type Tone = 'primary' | 'accent' | 'muted' | 'warn'
const TONES: Tone[] = ['primary', 'accent', 'muted', 'warn']

export type Point = { x: number; y: number }

/** A labelled 2D plot: curves, shaded regions, marked points, notes. */
export type PlotSpec = {
  kind: 'plot'
  caption: string
  xLabel: string
  yLabel: string
  xRange: [number, number]
  yRange: [number, number]
  lines: { label?: string; points: Point[]; dashed?: boolean; tone?: Tone }[]
  areas: { label?: string; points: Point[]; tone?: Tone }[]
  marks: { x: number; y: number; label?: string; tone?: Tone }[]
  notes: { x: number; y: number; text: string }[]
}

/** A body with forces on it. Angles in degrees, 0 pointing right, 90 up. */
export type ForcesSpec = {
  kind: 'forces'
  caption: string
  body: 'block' | 'disc'
  bodyLabel?: string
  /** Incline angle in degrees; 0 draws flat ground. */
  incline: number
  arrows: { label: string; angle: number; length?: number; tone?: Tone }[]
  notes: string[]
}

/** A two-by-two game. Payoffs are shown as written. */
export type MatrixSpec = {
  kind: 'matrix'
  caption: string
  rowPlayer: string
  colPlayer: string
  rowOptions: [string, string]
  colOptions: [string, string]
  /** [row][col] pairs, row player's payoff first. */
  cells: [[string, string], [string, string]]
  /** Cell to ring, as [row, col]. */
  highlight?: [number, number]
  notes: string[]
}

export type FigureSpec = PlotSpec | ForcesSpec | MatrixSpec

// --------------------------------------------------------------- parsing ---
// Authored content is still input. Everything below narrows unknown JSON to
// one of the types above, or returns null and the block renders as prose.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const tone = (value: unknown): Tone | undefined =>
  typeof value === 'string' && (TONES as string[]).includes(value) ? (value as Tone) : undefined

function points(value: unknown): Point[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return []
    const x = num(entry.x)
    const y = num(entry.y)
    return x === null || y === null ? [] : [{ x, y }]
  })
}

function range(value: unknown, fallback: [number, number]): [number, number] {
  if (!Array.isArray(value) || value.length !== 2) return fallback
  const low = num(value[0])
  const high = num(value[1])
  if (low === null || high === null || low === high) return fallback
  return [low, high]
}

function parsePlot(raw: Record<string, unknown>): PlotSpec | null {
  const lines = Array.isArray(raw.lines)
    ? raw.lines.flatMap((entry) => {
        if (!isRecord(entry)) return []
        const shape = points(entry.points)
        // A line needs two points to be a line.
        if (shape.length < 2) return []
        return [
          {
            label: typeof entry.label === 'string' ? entry.label : undefined,
            points: shape,
            dashed: entry.dashed === true,
            tone: tone(entry.tone),
          },
        ]
      })
    : []

  const areas = Array.isArray(raw.areas)
    ? raw.areas.flatMap((entry) => {
        if (!isRecord(entry)) return []
        const shape = points(entry.points)
        if (shape.length < 3) return []
        return [
          {
            label: typeof entry.label === 'string' ? entry.label : undefined,
            points: shape,
            tone: tone(entry.tone),
          },
        ]
      })
    : []

  if (lines.length === 0 && areas.length === 0) return null

  return {
    kind: 'plot',
    caption: str(raw.caption),
    xLabel: str(raw.xLabel),
    yLabel: str(raw.yLabel),
    xRange: range(raw.xRange, [0, 10]),
    yRange: range(raw.yRange, [0, 10]),
    lines,
    areas,
    marks: Array.isArray(raw.marks)
      ? raw.marks.flatMap((entry) => {
          if (!isRecord(entry)) return []
          const x = num(entry.x)
          const y = num(entry.y)
          if (x === null || y === null) return []
          return [{ x, y, label: typeof entry.label === 'string' ? entry.label : undefined, tone: tone(entry.tone) }]
        })
      : [],
    notes: Array.isArray(raw.notes)
      ? raw.notes.flatMap((entry) => {
          if (!isRecord(entry)) return []
          const x = num(entry.x)
          const y = num(entry.y)
          const text = str(entry.text)
          if (x === null || y === null || !text) return []
          return [{ x, y, text }]
        })
      : [],
  }
}

function parseForces(raw: Record<string, unknown>): ForcesSpec | null {
  const arrows = Array.isArray(raw.arrows)
    ? raw.arrows.flatMap((entry) => {
        if (!isRecord(entry)) return []
        const angle = num(entry.angle)
        const label = str(entry.label)
        if (angle === null || !label) return []
        const length = num(entry.length)
        return [
          {
            label,
            angle,
            length: length === null ? 1 : Math.min(1.4, Math.max(0.25, length)),
            tone: tone(entry.tone),
          },
        ]
      })
    : []

  if (arrows.length === 0) return null

  const incline = num(raw.incline)
  return {
    kind: 'forces',
    caption: str(raw.caption),
    body: raw.body === 'disc' ? 'disc' : 'block',
    bodyLabel: typeof raw.bodyLabel === 'string' ? raw.bodyLabel : undefined,
    incline: incline === null ? 0 : Math.min(60, Math.max(0, incline)),
    arrows,
    notes: Array.isArray(raw.notes) ? raw.notes.filter((n): n is string => typeof n === 'string') : [],
  }
}

function parseMatrix(raw: Record<string, unknown>): MatrixSpec | null {
  const pair = (value: unknown): [string, string] | null =>
    Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === 'string')
      ? [value[0] as string, value[1] as string]
      : null

  const rowOptions = pair(raw.rowOptions)
  const colOptions = pair(raw.colOptions)
  if (!rowOptions || !colOptions) return null

  const rows = Array.isArray(raw.cells) ? raw.cells.map(pair) : []
  if (rows.length !== 2 || rows.some((row) => row === null)) return null

  const highlight =
    Array.isArray(raw.highlight) && raw.highlight.length === 2
      ? ([num(raw.highlight[0]) ?? 0, num(raw.highlight[1]) ?? 0] as [number, number])
      : undefined

  return {
    kind: 'matrix',
    caption: str(raw.caption),
    rowPlayer: str(raw.rowPlayer, 'Row'),
    colPlayer: str(raw.colPlayer, 'Column'),
    rowOptions,
    colOptions,
    cells: [rows[0]!, rows[1]!],
    highlight,
    notes: Array.isArray(raw.notes) ? raw.notes.filter((n): n is string => typeof n === 'string') : [],
  }
}

/** The single entry point. Anything unrecognised becomes null, not a crash. */
export function parseFigure(kind: unknown, spec: unknown): FigureSpec | null {
  if (typeof kind !== 'string' || !isRecord(spec)) return null
  const raw = { ...spec }

  if (kind === 'plot') return parsePlot(raw)
  if (kind === 'forces') return parseForces(raw)
  if (kind === 'matrix') return parseMatrix(raw)
  return null
}
