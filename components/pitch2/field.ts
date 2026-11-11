/**
 * The particle engine behind the second pitch deck. Up to 70 000 points live on
 * the GPU: each carries where it came from and where it is going, and the
 * vertex shader does the morph, the soft drift and the camera, so
 * the frame rate does not depend on the particle count.
 *
 * Everything is in stage units: a 1600 x 900 stage with the origin in the
 * middle and y pointing up.
 */

export const STAGE_W = 1600
export const STAGE_H = 900

const N = 70000
const MORPH_MS = 2600
const CAMERA = 1200

type Shape = {
  /** x, y, z, spin multiplier (-1 marks a background star). */
  data: Float32Array
  spinZ: number
  spinY: number
  tilt: number
  center: [number, number, number]
  dim: number
  cool: number
  rest: number
}

const VERT = `#version 300 es
precision highp float;
in vec3 aFrom;
in vec4 aTo;
in vec4 aSeed;
uniform float uT, uTime, uAge, uSpinZ, uSpinY, uTilt, uRest, uDim, uCool, uDpr, uS;
uniform vec2 uRes, uMouse, uPar;
uniform vec3 uC, uA, uB, uD;
out vec3 vColor;
out float vAlpha;

vec3 flow(vec3 p, float t) {
  return vec3(
    sin(p.y * .007 + t) + cos(p.z * .005 - t * .7),
    sin(p.z * .006 + t * 1.3) + cos(p.x * .008 + t),
    sin(p.x * .005 - t) + cos(p.y * .006 + t * .6));
}

void main() {
  float amb = aTo.w < -.5 ? 1. : 0.;
  float spin = max(aTo.w, 0.);

  vec3 to = aTo.xyz - uC;
  float az = uAge * uSpinZ * spin;
  to.xy = mat2(cos(az), sin(az), -sin(az), cos(az)) * to.xy;
  to.yz = mat2(cos(uTilt), sin(uTilt), -sin(uTilt), cos(uTilt)) * to.yz;
  float ay = uAge * uSpinY * spin;
  to.xz = mat2(cos(ay), sin(ay), -sin(ay), cos(ay)) * to.xz;
  to += uC;

  float delay = aSeed.x * .35;
  float p = clamp((uT - delay) / .65, 0., 1.);
  float e = p < .5 ? 4. * p * p * p : 1. - pow(-2. * p + 2., 3.) / 2.;
  float arc = sin(3.14159 * p);

  vec3 pos = mix(aFrom, to, e);
  pos += flow(pos, uTime * .9 + aSeed.y * 3.) * arc * 46.;
  pos.z += arc * (aSeed.y - .5) * 220.;
  pos.xy += vec2(sin(uTime * .9 + aSeed.z * 6.28), cos(uTime * .7 + aSeed.w * 6.28)) * uRest;

  vec2 fromMouse = pos.xy - uMouse;
  float m = length(fromMouse) + .001;
  if (m < 150.) pos.xy += fromMouse / m * (1. - m / 150.) * 70.;

  pos.z = min(pos.z, ${(CAMERA - 120).toFixed(1)});
  float k = ${CAMERA.toFixed(1)} / (${CAMERA.toFixed(1)} - pos.z);
  vec2 sc = (pos.xy + pos.z * uPar) * k * uS;
  gl_Position = vec4(sc * 2. / uRes, 0., 1.);

  float size = (2.3 + aSeed.w * 2.9) * k * uS * uDpr * (1. + arc * .25);
  gl_PointSize = min(size * (amb > .5 ? .8 : 1.), 46.);

  float pick = aSeed.z;
  vColor = pick < .55 ? uA : pick < .85 ? uB : uD;
  if (fract(aSeed.w * 17.) < uCool) vColor = vec3(.5, .66, .92);
  float twinkle = (.75 + .25 * sin(uTime * 2.4 + aSeed.x * 40.)) * mix(.3, 1.7, smoothstep(-280., 280., pos.z));
  vAlpha = (amb > .5 ? .2 : uDim * 1.5) * twinkle;
}`

const FRAG = `#version 300 es
precision mediump float;
in vec3 vColor;
in float vAlpha;
out vec4 frag;
void main() {
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, .05, d);
  a = a * vAlpha;
  frag = vec4(vColor * a, a);
}`

const rnd = () => Math.random()

function fill(out: Float32Array, from: number) {
  for (let i = from; i < N; i++) {
    const j = i * 4
    out[j] = (rnd() - 0.5) * 3400
    out[j + 1] = (rnd() - 0.5) * 2100
    out[j + 2] = -1600 + rnd() * 1700
    out[j + 3] = -1
  }
}

function shape(data: Float32Array, o: Partial<Omit<Shape, 'data'>> = {}): Shape {
  return { data, spinZ: 0, spinY: 0, tilt: 0, center: [0, 0, 0], dim: 0.42, cool: 0.04, rest: 2.5, ...o }
}

function sphere(out: Float32Array, i: number, cx: number, cy: number, r: number) {
  const u = rnd() * 2 - 1
  const a = rnd() * Math.PI * 2
  const s = Math.sqrt(1 - u * u)
  const R = r * (rnd() < 0.72 ? 1 : Math.cbrt(rnd()))
  out[i] = cx + R * s * Math.cos(a)
  out[i + 1] = cy + R * s * Math.sin(a)
  out[i + 2] = R * u
  out[i + 3] = 1
}

type Line = { text: string; x: number; y: number; size: number; width?: number }

/** Writes the words onto a hidden canvas and returns its filled pixels. */
function textPoints(lines: Line[], family: string) {
  const c = document.createElement('canvas')
  c.width = STAGE_W
  c.height = STAGE_H
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  for (const l of lines) {
    g.font = `900 ${l.size}px ${family}`
    let size = l.size
    if (l.width) {
      size = (l.size * l.width) / g.measureText(l.text).width
      g.font = `900 ${size}px ${family}`
    }
    g.fillText(l.text, l.x, l.y)
  }
  const px = g.getImageData(0, 0, STAGE_W, STAGE_H).data
  const pts: number[] = []
  for (let y = 0; y < STAGE_H; y++) {
    for (let x = 0; x < STAGE_W; x++) {
      if (px[(y * STAGE_W + x) * 4 + 3] > 120) pts.push(x - STAGE_W / 2, STAGE_H / 2 - y)
    }
  }
  return pts
}

/** The opening state: a thin field of stars the title condenses out of. */
function scattered() {
  const d = new Float32Array(N * 4)
  fill(d, 0)
  return shape(d, { rest: 1.5 })
}

function title(family: string) {
  const d = new Float32Array(N * 4)
  const pts = textPoints(
    [
      { text: 'OLYMP', x: 800, y: 262, size: 420, width: 1420 },
      { text: 'AI', x: 268, y: 640, size: 400 },
    ],
    family,
  )
  const n = Math.min(pts.length / 2, Math.floor(N * 0.92))
  const step = pts.length / 2 / n
  for (let i = 0; i < n; i++) {
    const p = Math.floor(i * step) * 2
    d[i * 4] = pts[p] + rnd() - 0.5
    d[i * 4 + 1] = pts[p + 1] + rnd() - 0.5
    d[i * 4 + 2] = (rnd() - 0.5) * 8
    d[i * 4 + 3] = 0
  }
  fill(d, n)
  return shape(d, { dim: 0.95, rest: 0.8 })
}

/** Four separate islands: theory, problems, progress, teacher. */
function islands() {
  const d = new Float32Array(N * 4)
  const xs = [-570, -190, 190, 570]
  const n = Math.floor(N * 0.8)
  for (let i = 0; i < n; i++) sphere(d, i * 4, xs[i % 4], -165, 112)
  fill(d, n)
  return shape(d, { dim: 0.34, rest: 3, cool: 0 })
}

function core() {
  const d = new Float32Array(N * 4)
  const n = Math.floor(N * 0.86)
  for (let i = 0; i < n; i++) sphere(d, i * 4, 400, -20, 275)
  fill(d, n)
  return shape(d, { spinY: 0.16, tilt: 0.3, center: [400, -20, 0], dim: 0.3, cool: 0.12 })
}

/** A line of reasoning that runs, breaks once, and limps on. */
function ribbon() {
  const d = new Float32Array(N * 4)
  const n = Math.floor(N * 0.72)
  const BREAK = 170
  for (let i = 0; i < n; i++) {
    const j = i * 4
    const x = -740 + rnd() * 1480
    const wave = Math.sin(x * 0.009) * 34
    const after = x > BREAK
    const spread = after ? 13 + (x - BREAK) * 0.12 : 10
    const g = (rnd() + rnd() + rnd()) / 1.5 - 1
    d[j] = x
    d[j + 1] = 148 + wave + g * spread - (after ? 44 + (x - BREAK) * 0.09 : 0)
    d[j + 2] = g * 34
    d[j + 3] = 0
    if (after && rnd() < 0.2) {
      d[j + 1] -= rnd() * 130
      d[j + 2] += (rnd() - 0.5) * 120
    }
  }
  fill(d, n)
  return shape(d, { dim: 0.5, rest: 3.5, cool: 0.03 })
}

/** Five flat layers, one for each row of the stack slide. */
function layers() {
  const d = new Float32Array(N * 4)
  const n = Math.floor(N * 0.8)
  const ys = [164, 48, -68, -184, -300]
  const R = 112
  for (let i = 0; i < n; i++) {
    const j = i * 4
    const edge = rnd() < 0.35
    let u = (rnd() * 2 - 1) * R
    let v = (rnd() * 2 - 1) * R
    if (edge) {
      if (rnd() < 0.5) u = Math.sign(u) * R
      else v = Math.sign(v) * R
    }
    d[j] = 500 + (u - v) * 0.87
    d[j + 1] = ys[i % 5] + (u + v) * 0.3
    d[j + 2] = 0
    d[j + 3] = 0
  }
  fill(d, n)
  return shape(d, { dim: 0.3, rest: 0.8, cool: 0.1 })
}

/** Rings whose areas match the market sizes: 240 : 60 : 3. */
function market() {
  const d = new Float32Array(N * 4)
  const n = Math.floor(N * 0.84)
  const R = 318
  const rings = [R, R * Math.sqrt(60 / 240), R * Math.sqrt(3 / 240)]
  for (let i = 0; i < n; i++) {
    const j = i * 4
    const which = i % 20 < 11 ? 0 : i % 20 < 19 ? 1 : 2
    const outer = rings[which]
    const inner = which === 2 ? 0 : rings[which + 1]
    const rim = which !== 2 && rnd() < 0.8
    const r = rim ? outer * (1 - rnd() * 0.05) : Math.sqrt(inner * inner + rnd() * (outer * outer - inner * inner))
    const a = rnd() * Math.PI * 2
    d[j] = -400 + Math.cos(a) * r
    d[j + 1] = -56 + Math.sin(a) * r
    d[j + 2] = (rnd() - 0.5) * 12
    d[j + 3] = [0.45, 0.9, 2.2][which]
  }
  fill(d, n)
  return shape(d, { spinZ: 0.1, center: [-400, -56, 0], dim: 0.32, rest: 1.2 })
}

function flywheel() {
  const d = new Float32Array(N * 4)
  const n = Math.floor(N * 0.8)
  const R = 258
  for (let i = 0; i < n; i++) {
    const j = i * 4
    const a = rnd() * Math.PI * 2
    const b = rnd() * Math.PI * 2
    const t = 18 + rnd() * 16
    const r = R + Math.cos(b) * t
    d[j] = -340 + Math.cos(a) * r
    d[j + 1] = -30 + Math.sin(a) * r
    d[j + 2] = Math.sin(b) * t
    d[j + 3] = 1
  }
  fill(d, n)
  return shape(d, { spinZ: -0.22, center: [-340, -30, 0], dim: 0.42, cool: 0.08, rest: 1.2 })
}

function climb() {
  const d = new Float32Array(N * 4)
  const n = Math.floor(N * 0.76)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    const t = Math.pow(rnd(), 0.8)
    const g = (rnd() + rnd() + rnd()) / 1.5 - 1
    const w = 8 + t * 34
    d[j] = -780 + t * 1560
    d[j + 1] = -430 + Math.pow(t, 2.4) * 740 + g * w
    d[j + 2] = g * 70
    d[j + 3] = 0
  }
  fill(d, n)
  return shape(d, { dim: 0.26, rest: 2, cool: 0.05 })
}

function galaxy() {
  const d = new Float32Array(N * 4)
  const n = Math.floor(N * 0.93)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    const u = rnd()
    const r = 230 + u * u * 780
    const arm = (i % 4) * (Math.PI / 2)
    const a = arm + r * 0.0095 + (rnd() - 0.5) * (0.5 + 120 / r)
    d[j] = Math.cos(a) * r
    d[j + 1] = Math.sin(a) * r
    d[j + 2] = (rnd() - 0.5) * (60 - r * 0.04)
    d[j + 3] = 0.25 + (1 - r / 1010) * 1.7
  }
  fill(d, n)
  return shape(d, { spinZ: 0.08, tilt: -1.08, dim: 0.34, cool: 0.2, rest: 1 })
}

export class Field {
  private gl: WebGL2RenderingContext | null
  private prog!: WebGLProgram
  private fromBuf!: WebGLBuffer
  private toBuf!: WebGLBuffer
  private u: Record<string, WebGLUniformLocation | null> = {}
  private from = new Float32Array(N * 3)
  private seeds = new Float32Array(N * 4)
  private shapes: Shape[]
  private cur: Shape
  private prevDim: number
  private prevCool: number
  private prevRest: number
  private start = 0
  private mouse: [number, number] = [9999, 9999]
  private par: [number, number] = [0, 0]
  private parGoal: [number, number] = [0, 0]
  private raf = 0
  private count = N
  private frames = 0
  private frameMs = 0
  private lastFrame = 0
  private w = 1
  private h = 1
  private dpr = 1
  private s = 1

  constructor(private canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true })
    this.cur = scattered()
    this.shapes = [this.cur]
    this.prevDim = this.cur.dim
    this.prevCool = this.cur.cool
    this.prevRest = this.cur.rest
    if (!this.gl) return
    this.setup()
    this.resize()
    this.raf = requestAnimationFrame(this.frame)
  }

  /** Formations that draw text wait for the display font. */
  build(family: string) {
    this.shapes = [title(family), islands(), core(), ribbon(), layers(), market(), flywheel(), climb(), galaxy()]
  }

  private setup() {
    const gl = this.gl!
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader')
      return sh
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link')
    gl.useProgram(prog)
    this.prog = prog

    const names = ['uT', 'uTime', 'uAge', 'uSpinZ', 'uSpinY', 'uTilt', 'uRest', 'uDim', 'uCool', 'uDpr', 'uS', 'uRes', 'uMouse', 'uPar', 'uC', 'uA', 'uB', 'uD']
    for (const n of names) this.u[n] = gl.getUniformLocation(prog, n)

    for (let i = 0; i < N * 4; i++) this.seeds[i] = rnd()

    const attr = (name: string, size: number, data: Float32Array, usage: number) => {
      const buf = gl.createBuffer()!
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, data, usage)
      const loc = gl.getAttribLocation(prog, name)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
      return buf
    }
    const s = this.cur.data
    for (let i = 0; i < N; i++) {
      this.from[i * 3] = s[i * 4]
      this.from[i * 3 + 1] = s[i * 4 + 1]
      this.from[i * 3 + 2] = s[i * 4 + 2]
    }
    this.fromBuf = attr('aFrom', 3, this.from, gl.DYNAMIC_DRAW)
    this.toBuf = attr('aTo', 4, s, gl.DYNAMIC_DRAW)
    attr('aSeed', 4, this.seeds, gl.STATIC_DRAW)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    gl.clearColor(0, 0, 0, 0)

    gl.uniform3f(this.u.uA, 0.937, 0.42, 0.365)
    gl.uniform3f(this.u.uB, 1, 0.74, 0.66)
    gl.uniform3f(this.u.uD, 0.945, 0.937, 0.918)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    this.w = window.innerWidth
    this.h = window.innerHeight
    this.s = Math.min(this.w / STAGE_W, this.h / STAGE_H)
    this.canvas.width = Math.round(this.w * this.dpr)
    this.canvas.height = Math.round(this.h * this.dpr)
    this.canvas.style.width = `${this.w}px`
    this.canvas.style.height = `${this.h}px`
    this.gl?.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  pointer(clientX: number, clientY: number) {
    this.mouse = [(clientX - this.w / 2) / this.s, (this.h / 2 - clientY) / this.s]
    this.parGoal = [((clientX / this.w) * 2 - 1) * -0.06, (1 - (clientY / this.h) * 2) * -0.04]
  }

  /** Where every particle is right now, so a new morph starts from there. */
  private bake(now: number) {
    const raw = Math.min(1, (now - this.start) / MORPH_MS)
    const age = (now - this.start) / 1000
    const c = this.cur
    const [cx, cy, cz] = c.center
    for (let i = 0; i < N; i++) {
      const j = i * 4
      const spin = Math.max(c.data[j + 3], 0)
      let x = c.data[j] - cx
      let y = c.data[j + 1] - cy
      let z = c.data[j + 2] - cz

      const az = age * c.spinZ * spin
      const ca = Math.cos(az)
      const sa = Math.sin(az)
      ;[x, y] = [ca * x - sa * y, sa * x + ca * y]
      const ct = Math.cos(c.tilt)
      const st = Math.sin(c.tilt)
      ;[y, z] = [ct * y - st * z, st * y + ct * z]
      const ay = age * c.spinY * spin
      const cy2 = Math.cos(ay)
      const sy2 = Math.sin(ay)
      ;[x, z] = [cy2 * x - sy2 * z, sy2 * x + cy2 * z]
      x += cx
      y += cy
      z += cz

      const p = Math.max(0, Math.min(1, (raw - this.seeds[j] * 0.35) / 0.65))
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
      const k = i * 3
      this.from[k] = this.from[k] + (x - this.from[k]) * e
      this.from[k + 1] = this.from[k + 1] + (y - this.from[k + 1]) * e
      this.from[k + 2] = this.from[k + 2] + (z - this.from[k + 2]) * e
    }
  }

  set(index: number) {
    const next = this.shapes[index]
    if (!next || !this.gl) return
    const now = performance.now()
    const blend = Math.min(1, (now - this.start) / MORPH_MS)
    this.bake(now)
    this.prevDim += (this.cur.dim - this.prevDim) * blend
    this.prevCool += (this.cur.cool - this.prevCool) * blend
    this.prevRest += (this.cur.rest - this.prevRest) * blend
    this.cur = next
    this.start = now
    const gl = this.gl
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fromBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.from)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.toBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, next.data)
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame)
    const gl = this.gl!
    const dt = now - this.lastFrame
    this.lastFrame = now
    // On a weak projector laptop, halve the particles rather than stutter.
    // Long gaps mean a hidden tab, which says nothing about the GPU.
    if (this.frames < 120 && dt < 100) {
      this.frames++
      this.frameMs += dt
      if (this.frames === 120 && this.frameMs / 120 > 26) this.count = N / 2
    }

    const c = this.cur
    const t = performance.now()
    const raw = Math.min(1, (t - this.start) / MORPH_MS)
    const u = this.u
    this.par[0] += (this.parGoal[0] - this.par[0]) * 0.05
    this.par[1] += (this.parGoal[1] - this.par[1]) * 0.05

    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform1f(u.uT, raw)
    gl.uniform1f(u.uTime, t / 1000)
    gl.uniform1f(u.uAge, (t - this.start) / 1000)
    gl.uniform1f(u.uSpinZ, c.spinZ)
    gl.uniform1f(u.uSpinY, c.spinY)
    gl.uniform1f(u.uTilt, c.tilt)
    gl.uniform1f(u.uRest, this.prevRest + (c.rest - this.prevRest) * raw)
    gl.uniform1f(u.uDim, this.prevDim + (c.dim - this.prevDim) * raw)
    gl.uniform1f(u.uCool, this.prevCool + (c.cool - this.prevCool) * raw)
    gl.uniform1f(u.uDpr, this.dpr)
    gl.uniform1f(u.uS, this.s)
    gl.uniform2f(u.uRes, this.w, this.h)
    gl.uniform2f(u.uMouse, this.mouse[0], this.mouse[1])
    gl.uniform2f(u.uPar, this.par[0], this.par[1])
    gl.uniform3f(u.uC, c.center[0], c.center[1], c.center[2])
    gl.drawArrays(gl.POINTS, 0, this.count)
  }
}
