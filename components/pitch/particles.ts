/**
 * The particle field behind the pitch deck. A few thousand dots that either
 * drift, scatter, orbit a point, or assemble into a word, and move between
 * those states with a spring so every slide change is one continuous motion.
 *
 * Coordinates of formations are given in stage units (the deck is laid out on
 * a 1600 x 900 stage scaled to the window), so a word lands where the slide
 * expects it at any window size.
 */

export const STAGE_W = 1600
export const STAGE_H = 900

export type Formation =
  | { kind: 'drift' }
  | { kind: 'chaos' }
  | { kind: 'ring'; x: number; y: number; r: number }
  | { kind: 'text'; text: string; x: number; y: number; size: number; serif?: boolean }

type P = {
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  ty: number
  on: boolean
  c: number
  a: number
  s: number
  ang: number
}

export class ParticleField {
  private ctx: CanvasRenderingContext2D
  private ps: P[] = []
  private w = 0
  private h = 0
  private dpr = 1
  private raf = 0
  private t = 0
  private formation: Formation = { kind: 'drift' }
  private mouse = { x: -9999, y: -9999 }
  private colors = ['#112b51', '#aeb5c2', '#fff']
  private dark = true

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    this.resize()
    this.loop = this.loop.bind(this)
    this.raf = requestAnimationFrame(this.loop)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
  }

  setTheme(dark: boolean, brand: string, highlight: string, ink: string) {
    this.dark = dark
    this.colors = [brand, highlight, ink]
  }

  pointer(x: number, y: number) {
    this.mouse.x = x
    this.mouse.y = y
  }

  private stage() {
    const s = Math.min(this.w / STAGE_W, this.h / STAGE_H)
    return { s, ox: (this.w - STAGE_W * s) / 2, oy: (this.h - STAGE_H * s) / 2 }
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.w = window.innerWidth
    this.h = window.innerHeight
    this.canvas.width = this.w * this.dpr
    this.canvas.height = this.h * this.dpr
    this.canvas.style.width = `${this.w}px`
    this.canvas.style.height = `${this.h}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    const want = Math.round(Math.min(3400, Math.max(1400, (this.w * this.h) / 450)))
    while (this.ps.length < want) {
      this.ps.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: 0,
        vy: 0,
        tx: 0,
        ty: 0,
        on: false,
        c: Math.random() < 0.55 ? 0 : Math.random() < 0.6 ? 1 : 2,
        a: 0.25 + Math.random() * 0.75,
        s: 0.9 + Math.random() * 1.3,
        ang: Math.random() * Math.PI * 2,
      })
    }
    this.ps.length = want
    this.apply(this.formation, false)
  }

  set(formation: Formation, burst = true) {
    this.formation = formation
    this.apply(formation, burst)
  }

  private apply(f: Formation, burst: boolean) {
    if (burst) {
      for (const p of this.ps) {
        const a = Math.random() * Math.PI * 2
        const k = 3 + Math.random() * 9
        p.vx += Math.cos(a) * k
        p.vy += Math.sin(a) * k
      }
    }
    for (const p of this.ps) p.on = false
    if (f.kind !== 'text') return

    const { s, ox, oy } = this.stage()
    const off = document.createElement('canvas')
    off.width = Math.ceil(this.w)
    off.height = Math.ceil(this.h)
    const o = off.getContext('2d', { willReadFrequently: true })!
    const root = getComputedStyle(document.documentElement)
    const family = f.serif
      ? root.getPropertyValue('--font-literata').trim() || 'Georgia, serif'
      : root.getPropertyValue('--font-sans-ui').trim() || 'system-ui, sans-serif'
    o.font = `600 ${f.size * s}px ${family}`
    o.textAlign = 'center'
    o.textBaseline = 'middle'
    o.fillStyle = '#000'
    o.fillText(f.text, ox + f.x * s, oy + f.y * s)

    const data = o.getImageData(0, 0, off.width, off.height).data
    const pts: [number, number][] = []
    const gap = Math.max(2, Math.round(2.4 * s))
    for (let y = 0; y < off.height; y += gap) {
      for (let x = 0; x < off.width; x += gap) {
        if (data[(y * off.width + x) * 4 + 3] > 128) pts.push([x, y])
      }
    }
    // Shuffle so the word fills evenly however many dots are free.
    for (let i = pts.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0
      ;[pts[i], pts[j]] = [pts[j], pts[i]]
    }
    const n = Math.min(pts.length, Math.round(this.ps.length * 0.85))
    for (let i = 0; i < n; i++) {
      const p = this.ps[i]
      p.on = true
      p.tx = pts[i][0] + (Math.random() - 0.5) * gap * 0.6
      p.ty = pts[i][1] + (Math.random() - 0.5) * gap * 0.6
    }
  }

  private last = 0

  private loop(now: number) {
    // Physics runs in 60 Hz steps, so a slow or throttled frame catches up
    // instead of slowing the whole motion down.
    const steps = this.last ? Math.min(40, Math.max(1, Math.round((now - this.last) / 16.7))) : 1
    this.last = now
    for (let k = 0; k < steps; k++) this.step()
    this.draw()
    this.raf = requestAnimationFrame(this.loop)
  }

  private step() {
    this.t += 1 / 60
    const { w, h, mouse, formation: f } = this

    const { s, ox, oy } = this.stage()
    const ring = f.kind === 'ring'
    const chaos = f.kind === 'chaos'
    const rcx = ring ? ox + f.x * s : 0
    const rcy = ring ? oy + f.y * s : 0
    const rr = ring ? f.r * s : 0
    const ringCount = ring ? Math.round(this.ps.length * 0.35) : 0

    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i]
      if (ring && i < ringCount) {
        const band = (i % 7) / 7
        const a = p.ang + this.t * (0.25 + band * 0.35) * (i % 2 ? 1 : -1)
        const r = rr * (1 + band * 0.55) + Math.sin(this.t * 2 + i) * 4 * s
        p.vx += (rcx + Math.cos(a) * r - p.x) * 0.02
        p.vy += (rcy + Math.sin(a) * r * 0.42 - p.y) * 0.02
        p.vx *= 0.86
        p.vy *= 0.86
      } else if (p.on) {
        p.vx += (p.tx - p.x) * 0.0065
        p.vy += (p.ty - p.y) * 0.0065
        p.vx *= 0.905
        p.vy *= 0.905
      } else {
        const j = chaos ? 0.9 : 0.05
        p.vx += (Math.random() - 0.5) * j + Math.cos(p.ang + this.t * 0.3) * 0.006
        p.vy += (Math.random() - 0.5) * j + Math.sin(p.ang + this.t * 0.3) * 0.006 - (chaos ? 0 : 0.004)
        p.vx *= chaos ? 0.95 : 0.985
        p.vy *= chaos ? 0.95 : 0.985
      }

      const dx = p.x - mouse.x
      const dy = p.y - mouse.y
      const d2 = dx * dx + dy * dy
      if (d2 < 16000) {
        const d = Math.sqrt(d2) || 1
        const k = (1 - d / 126) * 2.6
        p.vx += (dx / d) * k
        p.vy += (dy / d) * k
      }

      p.x += p.vx
      p.y += p.vy
      if (!p.on && !(ring && i < ringCount)) {
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10
      }
    }

  }

  private draw() {
    const { ctx, w, h, formation: f } = this
    ctx.clearRect(0, 0, w, h)
    const { s } = this.stage()
    const ring = f.kind === 'ring'
    const chaos = f.kind === 'chaos'
    const ringCount = ring ? Math.round(this.ps.length * 0.35) : 0
    ctx.globalCompositeOperation = this.dark ? 'lighter' : 'source-over'
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = this.colors[c]
      for (let i = 0; i < this.ps.length; i++) {
        const p = this.ps[i]
        if (p.c !== c) continue
        const lit = p.on || (ring && i < ringCount)
        ctx.globalAlpha = lit ? p.a : p.a * (chaos ? 0.55 : 0.22)
        const size = lit ? p.s * Math.max(1.3, s * 1.7) : p.s
        ctx.fillRect(p.x, p.y, size, size)
      }
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }
}
