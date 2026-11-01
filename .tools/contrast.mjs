/**
 * Every pair of a text token and the surface it is set on, in both themes,
 * against WCAG AA for body text (4.5:1).
 *
 * Reads the tokens straight out of app/globals.css, so the numbers are the ones
 * the browser paints rather than a copy that can drift. Pairs a token is never
 * set on are left out: muted-foreground on primary, say, would fail and mean
 * nothing.
 *
 *   node .tools/contrast.mjs
 */
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8')

function block(selector) {
  const start = css.indexOf(`${selector} {`)
  return css.slice(start, css.indexOf('\n}', start))
}

function tokens(text) {
  const out = {}
  for (const m of text.matchAll(/--([a-z0-9-]+):\s*oklch\(([^)]+)\)/g)) {
    const [L, C, H] = m[2].split('/')[0].trim().split(/\s+/).map(Number)
    out[m[1]] = [L, C, H]
  }
  return out
}

function toRgb([L, C, H]) {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  // Out-of-gamut channels clip the way the browser clips them.
  return linear.map((v) => Math.min(1, Math.max(0, v)))
}

function luminance(rgb) {
  const [r, g, b] = rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(fg, bg) {
  const [hi, lo] = [luminance(toRgb(fg)), luminance(toRgb(bg))].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const PAIRS = [
  ['foreground', ['background', 'card', 'popover', 'muted', 'secondary', 'accent']],
  ['muted-foreground', ['background', 'card', 'muted']],
  ['primary', ['background', 'card']],
  ['primary-foreground', ['primary']],
  ['accent-foreground', ['accent']],
  ['secondary-foreground', ['secondary']],
  ['destructive', ['background', 'card']],
  ['success', ['background', 'card']],
  ['warning', ['background', 'card']],
  ['sidebar-foreground', ['sidebar']],
  ['sidebar-accent-foreground', ['sidebar-accent']],
  ['sidebar-primary-foreground', ['sidebar-primary']],
]

const light = tokens(block(':root'))
const dark = { ...light, ...tokens(block('.dark')) }
let failures = 0

for (const [name, theme] of [['light', light], ['dark', dark]]) {
  console.log(`\n${name}`)
  for (const [text, surfaces] of PAIRS) {
    for (const surface of surfaces) {
      const r = ratio(theme[text], theme[surface])
      const ok = r >= 4.5
      if (!ok) failures++
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}  ${text} on ${surface}`)
    }
  }
}

console.log(failures ? `\n${failures} pair(s) under 4.5:1` : '\nevery pair is at least 4.5:1')
process.exitCode = failures ? 1 : 0
