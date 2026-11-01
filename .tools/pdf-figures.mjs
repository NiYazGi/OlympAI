/**
 * Pulls the raster figures out of a PDF, and says which page each came from.
 *
 * Olympiad physics is half pictures: a circuit, a pulley, a ray through a
 * prism. Text extraction drops them silently, which is how a problem reading
 * "determine the resistance of the circuit shown in the figure" ends up in a
 * catalogue with no figure and no way to solve it.
 *
 * Written against pdf.js directly (through unpdf's bundled copy) rather than
 * with a renderer, because rendering a page needs a native canvas and gives
 * back the whole page — header, two other problems and all. The image XObjects
 * are the figures themselves.
 *
 * PNG is encoded here, in about forty lines over zlib, for the same reason:
 * one more native dependency for one importer is a bad trade.
 */
import { createHash } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import { getDocumentProxy } from 'unpdf'
import { OPS } from 'unpdf/pdfjs'

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

/** 8-bit RGB, one filter byte per row — the simplest PNG that is still a PNG. */
export function encodePng(width, height, rgb) {
  const stride = width * 3
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * pdf.js hands back three shapes. Everything becomes RGB, and anything with
 * transparency is flattened onto white: these are figures printed on a page,
 * and a diagram composited onto a dark card would be unreadable.
 */
export function toRgb(img) {
  const { width, height, kind, data } = img
  const out = Buffer.alloc(width * height * 3, 0xff)
  if (!data) return null
  if (kind === 1) {
    // One bit per pixel, rows padded to a byte.
    const rowBytes = (width + 7) >> 3
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const bit = (data[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1
        const value = bit ? 0xff : 0x00
        const at = (y * width + x) * 3
        out[at] = out[at + 1] = out[at + 2] = value
      }
    }
    return out
  }
  if (kind === 2) {
    for (let i = 0; i < width * height; i += 1) {
      out[i * 3] = data[i * 3]
      out[i * 3 + 1] = data[i * 3 + 1]
      out[i * 3 + 2] = data[i * 3 + 2]
    }
    return out
  }
  if (kind === 3) {
    for (let i = 0; i < width * height; i += 1) {
      const alpha = data[i * 4 + 3] / 255
      for (let c = 0; c < 3; c += 1) {
        out[i * 3 + c] = Math.round(data[i * 4 + c] * alpha + 0xff * (1 - alpha))
      }
    }
    return out
  }
  return null
}

/**
 * Some of these figures are stored inverted — a PDF `/Decode [1 0 …]` array,
 * which a renderer applies and the operator list does not, so the picture
 * comes out of here as a cyan prism on a field of black.
 *
 * There is no flag to read at this level, so the image is judged by its own
 * pixels: a diagram printed on a page is mostly paper, and one that is a third
 * black with no white in it at all is the negative of itself.
 */
export function unInvert(rgb) {
  let black = 0
  let white = 0
  for (let i = 0; i < rgb.length; i += 3) {
    if (rgb[i] < 12 && rgb[i + 1] < 12 && rgb[i + 2] < 12) black += 1
    else if (rgb[i] > 243 && rgb[i + 1] > 243 && rgb[i + 2] > 243) white += 1
  }
  const pixels = rgb.length / 3
  if (black / pixels < 0.3 || white / pixels > 0.02) return rgb
  const flipped = Buffer.alloc(rgb.length)
  for (let i = 0; i < rgb.length; i += 1) flipped[i] = 255 - rgb[i]
  return flipped
}

/** pdf.js resolves an image either synchronously or through a callback. */
export function objectNamed(page, name) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 2000)
    try {
      const value = page.objs.get(name, (resolved) => {
        clearTimeout(timer)
        resolve(resolved ?? null)
      })
      if (value) {
        clearTimeout(timer)
        resolve(value)
      }
    } catch {
      clearTimeout(timer)
      resolve(null)
    }
  })
}

/** a·b, for the 2×3 affine matrices PDF content streams are written in. */
function multiply(a, b) {
  return [
    b[0] * a[0] + b[1] * a[2],
    b[0] * a[1] + b[1] * a[3],
    b[2] * a[0] + b[3] * a[2],
    b[2] * a[1] + b[3] * a[3],
    b[4] * a[0] + b[5] * a[2] + a[4],
    b[4] * a[1] + b[5] * a[3] + a[5],
  ]
}

/**
 * Every figure in the file, as PNG, with the page and the height it sits at.
 *
 * The position is the point of it. A paper holds four problems and five
 * pictures, and the only thing that says which belongs to which is where each
 * one is on the page — so the transformation matrix is tracked through the
 * content stream, exactly as a renderer would, and the figure's own y comes
 * out of it.
 *
 * Images that repeat are headers and seals, not figures, and anything too
 * small to be a diagram is dropped.
 */
async function figuresOf(pdf, { minWidth = 180, minHeight = 90 } = {}) {
  const found = []

  for (let number = 1; number <= pdf.numPages; number += 1) {
    const page = await pdf.getPage(number)
    const ops = await page.getOperatorList()

    let ctm = [1, 0, 0, 1, 0, 0]
    const stack = []
    const placed = []
    for (let k = 0; k < ops.fnArray.length; k += 1) {
      const fn = ops.fnArray[k]
      if (fn === OPS.save) stack.push(ctm)
      else if (fn === OPS.restore) ctm = stack.pop() ?? ctm
      else if (fn === OPS.transform) ctm = multiply(ctm, ops.argsArray[k])
      else if (fn === OPS.paintImageXObject) {
        // The image fills the unit square mapped by the matrix: f is its
        // bottom in PDF space and d its height, so f + d is its top.
        placed.push({ name: ops.argsArray[k][0], top: ctm[5] + Math.abs(ctm[3]) })
      }
    }

    for (const { name, top } of placed) {
      const img = await objectNamed(page, name)
      if (!img?.width || img.width < minWidth || img.height < minHeight) continue
      const rgb = unInvert(toRgb(img) ?? Buffer.alloc(0))
      if (!rgb.length) continue
      found.push({
        page: number,
        name,
        top,
        width: img.width,
        height: img.height,
        // Both forms: the PNG for a figure that stands alone, the pixels for
        // one that has to be stacked with another before it is encoded.
        rgb,
        png: encodePng(img.width, img.height, rgb),
      })
    }
  }

  // A logo repeats on every page; a figure appears once — or twice, because
  // these papers print each problem in Kazakh and again in Russian around the
  // same picture. So repeats are deduplicated by content rather than counted
  // out, and only something on a third page is furniture.
  const pages = new Map()
  for (const figure of found) {
    figure.hash = createHash('sha1').update(figure.png).digest('hex')
    pages.set(figure.hash, (pages.get(figure.hash) ?? 0) + 1)
  }
  const kept = new Set()
  return found.filter((figure) => {
    if (pages.get(figure.hash) > 2 || kept.has(figure.hash)) return false
    kept.add(figure.hash)
    return true
  })
}

/**
 * Where each problem starts: the page and the height of its heading.
 *
 * Read from the text layer's own geometry rather than from the extracted
 * string, because the string has no position and position is what decides
 * which picture goes with which problem.
 *
 * A heading arrives as several items — "Задача", " 1", " [5 баллов]" — and
 * `hasEOL` is not reliable across these files, so items are grouped into lines
 * by the height they share and then read left to right. Matching on the
 * fragments themselves found "задача 2" and missed four others.
 */
async function markersOf(pdf, pattern) {
  // A global regex would make `String.match` return every match and no capture
  // groups, so `match[1]` would be the second heading rather than its number.
  // The importers share one `/g` marker, so the flag is dropped here.
  const once = new RegExp(pattern.source, pattern.flags.replace('g', ''))
  const marks = []
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const page = await pdf.getPage(number)
    const content = await page.getTextContent()

    const lines = []
    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue
      const top = item.transform[5]
      const line = lines.find((l) => Math.abs(l.top - top) < 3)
      if (line) line.parts.push({ x: item.transform[4], str: item.str })
      else lines.push({ top, parts: [{ x: item.transform[4], str: item.str }] })
    }

    for (const line of lines.sort((a, b) => b.top - a.top)) {
      const text = line.parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str)
        .join('')
      const match = text.match(once)
      // The label is kept as it was written: the oblast papers number their
      // problems 1..4, the republican ones label them 1A, 1B, 1C, 2, 3.
      if (match) marks.push({ page: number, top: line.top, label: match[1] })
    }
  }
  return marks
}

/**
 * Figures and problem headings from one file, in one pass.
 *
 * Both in a single function because pdf.js detaches the byte array it is
 * handed: opening the same buffer twice fails with a DataCloneError, which is
 * a confusing way to be told to read the file once.
 */
export async function layoutOf(bytes, pattern, options) {
  const pdf = await getDocumentProxy(bytes)
  return { figures: await figuresOf(pdf, options), markers: await markersOf(pdf, pattern) }
}
