/**
 * Finds where a PDF page draws something other than text — a circuit, a graph,
 * a table — and reads the page's text with those places taken out.
 *
 * pdf-figures.mjs lifts raster images and nothing else. In the physics archive
 * most figures are vector paths, and every table is: ruling lines with numbers
 * between them. Text extraction keeps the numbers and drops the lines, so a
 * table arrived in the catalogue as "t, с 0 1 2 3 x, м 0 2 8 18" and a circuit
 * did not arrive at all. A problem that says "determine the current in the
 * circuit shown" with no circuit cannot be solved, and the grader marks it
 * anyway.
 *
 * So the page is read the way it is drawn. Every path that leaves ink and every
 * image is a box in page space; boxes that touch are one figure; the text that
 * sits inside a figure (axis labels, R₁, the cells of a table) belongs to the
 * figure rather than the statement. The figure itself is rendered by
 * render-crops.swift, and the statement gets a `![…](…)` line where the figure
 * stood, so the picture lands between the sentences it was printed between.
 *
 * Geometry is in PDF user space: points, origin bottom-left, y growing upwards.
 */
import { OPS } from 'unpdf/pdfjs'
import { objectNamed, toRgb, unInvert } from './pdf-figures.mjs'

const multiply = (a, b) => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
]

/** The axis-aligned box of a local rectangle under a matrix. */
function boxUnder(m, x0, y0, x1, y1) {
  const xs = []
  const ys = []
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
    xs.push(m[0] * x + m[2] * y + m[4])
    ys.push(m[1] * x + m[3] * y + m[5])
  }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

const width = (b) => b[2] - b[0]
const height = (b) => b[3] - b[1]
const grow = (b, d) => [b[0] - d, b[1] - d, b[2] + d, b[3] + d]
const union = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]
const touches = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]
function overlapShare(inner, outer) {
  const w = Math.min(inner[2], outer[2]) - Math.max(inner[0], outer[0])
  const h = Math.min(inner[3], outer[3]) - Math.max(inner[1], outer[1])
  if (w <= 0 || h <= 0) return 0
  return (w * h) / Math.max(1, width(inner) * height(inner))
}

/** White, in whatever shape pdf.js chose to hand the colour over in. */
function isWhite(color) {
  if (color == null) return false
  if (typeof color === 'string') return /^#?f{6}$/i.test(color)
  const values = Array.from(color)
  return values.length >= 3 && values.every((v) => v >= 250)
}

/** Every box on the page that leaves ink, from the operator list. */
async function inkOf(page) {
  const ops = await page.getOperatorList()
  const boxes = []
  let ctm = [1, 0, 0, 1, 0, 0]
  let fill = null
  const stack = []

  for (let k = 0; k < ops.fnArray.length; k += 1) {
    const fn = ops.fnArray[k]
    const args = ops.argsArray[k]
    if (fn === OPS.save) stack.push({ ctm, fill })
    else if (fn === OPS.restore) ({ ctm, fill } = stack.pop() ?? { ctm, fill })
    else if (fn === OPS.transform) ctm = multiply(ctm, args)
    else if (fn === OPS.paintFormXObjectBegin) {
      stack.push({ ctm, fill })
      if (Array.isArray(args?.[0]) || ArrayBuffer.isView(args?.[0])) ctm = multiply(ctm, Array.from(args[0]))
    } else if (fn === OPS.paintFormXObjectEnd) ({ ctm, fill } = stack.pop() ?? { ctm, fill })
    else if (fn === OPS.setFillRGBColor) fill = args?.[0] ?? args
    else if (fn === OPS.constructPath) {
      const [paint, , minMax] = args
      // A path that only clips draws nothing.
      if (paint === OPS.endPath || !minMax) continue
      const filled = paint === OPS.fill || paint === OPS.eoFill
      // White rectangles are backgrounds and erasers, not drawing.
      if (filled && isWhite(fill)) continue
      boxes.push({ box: boxUnder(ctm, minMax[0], minMax[1], minMax[2], minMax[3]), image: false })
    } else if (fn === OPS.paintImageXObject) {
      const inked = await inkedPart(page, args[0])
      if (inked) boxes.push({ box: boxUnder(ctm, ...inked), image: true })
    } else if (fn === OPS.paintInlineImageXObject || fn === OPS.paintImageMaskXObject) {
      boxes.push({ box: boxUnder(ctm, 0, 0, 1, 1), image: true })
    }
  }
  return boxes
}

/**
 * The part of an image that is not blank paper, in the image's unit square.
 *
 * Word exports a pasted picture with whatever margin it was cropped to, and a
 * margin is white. Two pictures either side of a paragraph then have boxes that
 * overlap across the paragraph, and the paragraph became part of the figure.
 */
async function inkedPart(page, name) {
  const img = await objectNamed(page, name)
  const rgb = img?.width ? toRgb(img) : null
  if (!rgb) return [0, 0, 1, 1]
  const pixels = unInvert(rgb)
  const { width: w, height: h } = img
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const at = (y * w + x) * 3
      if (pixels[at] > 240 && pixels[at + 1] > 240 && pixels[at + 2] > 240) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  // Row 0 is the top of the picture and the top of the unit square is y = 1.
  return [minX / w, 1 - (maxY + 1) / h, (maxX + 1) / w, 1 - minY / h]
}

/**
 * The figures on one page, as boxes in page space.
 *
 * `gap` is how far apart two strokes can be and still be one drawing: a
 * resistor and the wire leading to it are often not quite touching.
 */
function clusterInk(ink, view, { gap = 9 } = {}) {
  const pageArea = width(view) * height(view)
  let boxes = ink
    .map((i) => i.box)
    // Page frames and full-bleed backgrounds.
    .filter((b) => width(b) * height(b) < pageArea * 0.6)

  // Strokes are joined to strokes, never to the box of what has been joined so
  // far: two drawings set either side of a paragraph have a combined box that
  // covers the paragraph, and merging on that box swallowed the text between
  // them. Union-find over the strokes themselves; a page holds a few thousand.
  const parent = boxes.map((_, i) => i)
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const grown = boxes.map((b) => grow(b, gap / 2))
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (touches(grown[i], grown[j])) parent[find(i)] = find(j)
    }
  }
  const groups = new Map()
  boxes.forEach((box, i) => {
    const root = find(i)
    groups.set(root, groups.has(root) ? union(groups.get(root), box) : box)
  })
  boxes = [...groups.values()]

  // A rule, an underline, a fraction bar or a root sign is not a figure. A
  // figure is something with extent in both directions.
  return boxes.filter((b) => width(b) >= 36 && height(b) >= 24)
}

/**
 * Text items with their boxes, in content-stream order — the order extractText
 * reads them in, which is the order the statement parsers were written for.
 */
async function textOf(page) {
  const content = await page.getTextContent()
  const items = content.items
    .filter((item) => 'str' in item)
    .map((item) => {
      const [, , , d, e, f] = item.transform
      const h = item.height || Math.abs(d) || 10
      return { str: item.str, eol: item.hasEOL, box: [e, f, e + (item.width || 0), f + h] }
    })

  // Justified text arrives a word at a time, and each word on its own looks
  // exactly like a label. The line it sits on does not: so every item carries
  // the box of the whole printed line it belongs to.
  const lines = []
  for (const item of items) {
    if (!item.str.trim()) continue
    const line = lines.find((l) => Math.abs(l.base - item.box[1]) < 2)
    if (line) {
      line.box = union(line.box, item.box)
      line.items.push(item)
    } else lines.push({ base: item.box[1], box: item.box, items: [item] })
  }
  for (const line of lines) for (const item of line.items) item.line = line.box
  items.forEach((item, index) => (item.index = index))
  return { items, lines }
}

/**
 * Pulls labels that belong to a figure into it: the numbers on an axis, the
 * letters at the corners of a diagram, every cell of a table. One pass and no
 * more, so a figure set beside a paragraph does not swallow the paragraph one
 * line at a time.
 */
function absorbLabels(region, items) {
  const reach = grow(region, 6)
  let box = region
  for (const item of items) {
    if (!isLabel(item, region)) continue
    if (overlapShare(item.box, reach) > 0.5) box = union(box, item.box)
  }
  return box
}

/**
 * Short and narrow: R₁, "t, с", 0.25, a cell of a table. A line of the
 * statement that happens to run past a figure is neither, and taking it would
 * cut a sentence out of the problem.
 */
const isLabel = (item, region) =>
  item.str.trim().length > 0 &&
  item.str.trim().length <= 24 &&
  // The last word of a paragraph is short too, but it ends a sentence.
  !/\p{L}{3,}[.,;:!?»]$/u.test(item.str.trim()) &&
  width(item.box) < Math.max(60, width(region) * 0.6) &&
  // …and the line it is printed on stays near the figure too.
  overlapShare(item.line ?? item.box, grow(region, 24)) > 0.8

/**
 * Moves a figure's top and bottom edge off any line of the statement it only
 * grazes, so a crop does not start with the bottom half of a sentence.
 */
function trimLines(region, items) {
  let [x0, y0, x1, y1] = region
  for (const item of items) {
    if (!item.line || isLabel(item, region)) continue
    const [, ly0, , ly1] = item.line
    if (!touches(item.line, [x0, y0, x1, y1])) continue
    const middle = (ly0 + ly1) / 2
    if (middle > y1 - 1 || ly1 > y1 && ly0 > y0 + height(region) / 2) y1 = Math.min(y1, ly0 - 1)
    else if (middle < y0 + 1 || ly0 < y0 && ly1 < y1 - height(region) / 2) y0 = Math.max(y0, ly1 + 1)
  }
  return y1 - y0 >= 12 ? [x0, y0, x1, y1] : region
}

/**
 * Figures and text for every page of a document.
 *
 * Returns, per page, the figure boxes and the text with those figures taken
 * out, as the same `str`/`hasEOL` sequence extractText would have joined —
 * plus a `{ figure }` marker in the stream where each figure belongs.
 */
export async function pagesOf(pdf, options = {}) {
  const pages = []
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const page = await pdf.getPage(number)
    const view = page.view
    const { items, lines } = await textOf(page)
    const regions = clusterInk(await inkOf(page), view, options)
      .map((region) => absorbLabels(region, items))
      // Labels can make two figures overlap; they are then one figure.
      .reduce((acc, box) => {
        const hit = acc.findIndex((o) => touches(o, box))
        if (hit === -1) acc.push(box)
        else acc[hit] = union(acc[hit], box)
        return acc
      }, [])
      .map((box) => grow(box, 2))
      .map((box) => trimLines(box, items))
      .map((box) => [
        Math.max(view[0], box[0]),
        Math.max(view[1], box[1]),
        Math.min(view[2], box[2]),
        Math.min(view[3], box[3]),
      ])

    // A frame drawn round a block of prose — a list of sub-questions, a boxed
    // note — has the extent of a figure and none of its content. Two full
    // lines inside a box say it is text.
    for (let index = regions.length - 1; index >= 0; index -= 1) {
      const r = regions[index]
      const prose = items.filter((item) => {
        if (item.str.trim().length <= 24) return false
        const cx = (item.box[0] + item.box[2]) / 2
        const cy = (item.box[1] + item.box[3]) / 2
        return cx >= r[0] && cx <= r[2] && cy >= r[1] && cy <= r[3]
      })
      if (prose.length >= 2) regions.splice(index, 1)
    }

    const inside = (item) => {
      // Only labels leave the statement with their figure. A full line that
      // sits inside a figure's box is text wrapped around it, and stays.
      if (item.str.trim().length > 24) return -1
      if (item.line && regions.every((r) => overlapShare(item.line, grow(r, 24)) <= 0.8)) return -1
      const cx = (item.box[0] + item.box[2]) / 2
      const cy = (item.box[1] + item.box[3]) / 2
      return regions.findIndex((r) => cx >= r[0] && cx <= r[2] && cy >= r[1] && cy <= r[3])
    }

    // Where a reader meets each figure. Not by stream order: a content stream
    // is the order things were drawn in, and these papers draw the page footer
    // before the first problem. By geometry instead — the figure follows the
    // line printed just above its top edge, or level with it when text wraps
    // round it. A line in the figure's own column wins when there is one close
    // by, so a two-column page does not hand a figure to the other column.
    // On a two-column page the text beside a figure is the other column, not
    // text wrapped round it. A page is two-column when a good number of its
    // lines start right of the middle and are wide enough to be prose.
    const middle = (view[0] + view[2]) / 2
    const twoColumns =
      lines.filter((line) => line.box[0] > middle - 20 && width(line.box) > 120).length >= 8
    const anchors = new Map()
    const leading = []
    regions.forEach((region, index) => {
      const top = region[3]
      const candidates = lines
        .filter((line) => line.items.some((item) => inside(item) === -1))
        .filter((line) => (line.box[1] + line.box[3]) / 2 >= top - 6)
        .map((line) => ({ line, distance: Math.max(0, line.box[1] - top) }))
      const sameColumn = candidates
        .filter(({ line }) => line.box[0] < region[2] && region[0] < line.box[2])
        .sort((a, b) => a.distance - b.distance)[0]
      const any = candidates.sort((a, b) => a.distance - b.distance)[0]
      let chosen = sameColumn && sameColumn.distance <= (any?.distance ?? 0) + 40 ? sameColumn : any
      // Text wrapped round the figure: the lines beside it are what it
      // illustrates, and the line above it is often the end of the previous
      // problem — or the heading of the paper, which is no problem at all.
      // Unless the figure sits right under text of its own column, it goes
      // with the first line printed beside it.
      const beside = lines
        .filter((line) => line.items.some((item) => inside(item) === -1))
        .filter((line) => {
          const middle = (line.box[1] + line.box[3]) / 2
          const gap = Math.max(region[0] - line.box[2], line.box[0] - region[2])
          return middle < top && middle > region[1] && gap > 0 && gap < 40
        })
        .sort((a, b) => b.box[3] - a.box[3])[0]
      if (beside && !twoColumns) chosen = { line: beside, distance: 0 }
      if (!chosen) {
        leading.push(index)
        return
      }
      const at = Math.max(...chosen.line.items.map((item) => item.index))
      anchors.set(at, [...(anchors.get(at) ?? []), index])
    })

    const stream = leading.map((figure) => ({ figure }))
    for (const item of items) {
      if (inside(item) === -1) stream.push(item)
      for (const figure of anchors.get(item.index) ?? []) {
        // The anchor ends a line, so the figure starts a new one.
        if (!item.eol) stream.push({ str: '', eol: true })
        stream.push({ figure })
      }
    }

    // What is written inside each figure — its labels, and its caption when
    // the caption sits close enough to be taken in with them.
    const captions = regions.map((region, index) => {
      const nearest = (side) =>
        lines
          .filter((line) => line.box[0] < region[2] + 20 && region[0] - 20 < line.box[2])
          .map((line) => ({
            line,
            gap: side === 'above' ? line.box[1] - region[3] : region[1] - line.box[3],
          }))
          .filter(({ gap }) => gap > -4 && gap < 20)
          .sort((a, b) => a.gap - b.gap)[0]
          ?.line.items.map((item) => item.str)
          .join('')
          .trim() ?? ''
      return {
        inside: items.filter((item) => inside(item) === index).map((item) => item.str.trim()),
        above: nearest('above'),
        below: nearest('below'),
      }
    })

    pages.push({ number, view, regions, stream, captions })
  }

  // Furniture: a logo, a header box or a seal stands in the same place on
  // most pages. A figure does not.
  const key = (r) => r.map((v) => Math.round(v / 6)).join(',')
  const seen = new Map()
  for (const page of pages) for (const r of page.regions) seen.set(key(r), (seen.get(key(r)) ?? 0) + 1)
  for (const page of pages) {
    page.furniture = new Set(
      page.regions.flatMap((r, index) => (pages.length > 2 && seen.get(key(r)) >= 3 ? [index] : [])),
    )
  }
  return pages
}

/**
 * Joins the pages back into one string the way extractText does, with each
 * figure replaced by whatever `name(page, index)` returns — or nothing, when
 * it returns null.
 */
export function joinPages(pages, name) {
  return pages
    .map((page) =>
      page.stream
        .map((part) => {
          if ('figure' in part) {
            if (page.furniture.has(part.figure)) return ''
            const label = name(page, part.figure)
            return label ? `\n${label}\n` : ''
          }
          return part.str + (part.eol ? '\n' : '')
        })
        .join(''),
    )
    .join('\n')
}
