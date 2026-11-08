'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Camera, Check, ChevronLeft, ChevronRight, Expand, Languages, Minus, Moon, Sun, X } from 'lucide-react'
import { SuluGlyph } from '@/components/brand-mark'
import { ParticleField, STAGE_H, STAGE_W, type Formation } from './particles'
import './pitch.css'

/**
 * A five-slide pitch of the site, built on the site itself. Arrows, space,
 * PageUp/PageDown (a presentation clicker), a click or a swipe move between
 * slides; F goes full screen, T switches the theme.
 */

type Props = { tasks: string; olympiads: number }

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

function In({ fx = 'up', delay = 0, className, style, children }: { fx?: string; delay?: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div data-fx={fx} className={`pt-in ${className ?? ''}`} style={{ ...style, ...d(delay) }}>
      {children}
    </div>
  )
}

function Odometer({ value, active, delay = 0 }: { value: string; active: boolean; delay?: number }) {
  return (
    <span className="pt-odo tabular-nums">
      {value.split('').map((ch, i) =>
        /\d/.test(ch) ? (
          <span
            key={i}
            className="pt-odo-col"
            style={{
              transform: `translateY(${active ? -(Number(ch) + 10) : 0}em)`,
              transitionDelay: active ? `${delay + i * 120}ms` : '0ms',
            }}
          >
            {[...'01234567890123456789'].map((n, j) => (
              <span key={j}>{n}</span>
            ))}
          </span>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </span>
  )
}

/** Milliseconds since the slide became active, in 30 ms steps; 0 while inactive. */
function useClock(active: boolean, until = 12000) {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!active) return
    const start = performance.now()
    let raf = requestAnimationFrame(function tick(now) {
      const e = now - start
      setT(Math.floor(e / 30) * 30)
      if (e < until) raf = requestAnimationFrame(tick)
    })
    return () => {
      cancelAnimationFrame(raf)
      setT(0)
    }
  }, [active, until])
  return active ? t : 0
}

/* ------------------------------------------------------------------------ */

function DrawnLogo() {
  return (
    <svg viewBox="0 0 64 64" className="pt-draw size-[120px] overflow-visible" fill="none" aria-hidden>
      <defs>
        <linearGradient id="pt-g" x1="12" y1="52" x2="56" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffc9c9" />
          <stop offset="0.45" stopColor="#ff6363" />
          <stop offset="1" stopColor="#e5484d" />
        </linearGradient>
      </defs>
      <path d="M44.6 46.2A21 21 0 1 1 49 30" stroke="url(#pt-g)" strokeWidth="6.5" strokeLinecap="round" fillOpacity="0" />
      <path d="M33.5 18 37.4 24.4 25.6 44.6H17.8Z" stroke="#ff6363" strokeWidth="1" fill="url(#pt-g)" fillOpacity="0" />
      <path d="M30 18.2c1.4-2.3 4.7-2.3 6.1 0L57 54.6h-8.2L33.5 28.4Z" stroke="#ff6363" strokeWidth="1" fill="url(#pt-g)" fillOpacity="0" />
      <path d="M54 4.5 55.6 9 60 10.5 55.6 12 54 16.5 52.4 12 48 10.5 52.4 9Z" stroke="#ff6363" strokeWidth="1" fill="#ff6363" fillOpacity="0" />
    </svg>
  )
}

function SlideIntro() {
  return (
    <div className="flex h-full flex-col items-center text-center">
      <In fx="pop" delay={100} className="mt-2">
        <div className="relative">
          <div aria-hidden className="absolute inset-0 scale-150 rounded-full bg-[var(--brand)] opacity-25 blur-3xl" />
          <DrawnLogo />
        </div>
      </In>
      {/* The word "OlympAI" is drawn by the particles at y = 400. */}
      <div className="h-[330px]" />
      <In fx="blur" delay={1600}>
        <p className="pt-h2 !text-[54px]">
          Думай глубже. <span className="pt-ink">Тренируйся умнее.</span>
        </p>
      </In>
      <In delay={2100} className="mt-6">
        <p className="pt-lead">ИИ-тренер для олимпиад по математике и физике</p>
      </In>
    </div>
  )
}

function SlideUtility({ active, olympiads }: { active: boolean; olympiads: number }) {
  const pains = ['Архивы олимпиад разбросаны по PDF', 'Решение некому проверить', 'Готовый ответ вместо понимания']
  return (
    <div className="relative h-full">
      <In fx="left" className="pt-kicker">01 · Практическая польза</In>
      <In fx="up" delay={150} className="mt-6 w-[720px]">
        <h2 className="pt-h1">Олимпиадник один на один с задачей</h2>
      </In>
      <ul className="mt-12 grid w-[720px] gap-5">
        {pains.map((p, i) => (
          <In key={p} fx="left" delay={500 + i * 220}>
            <li className="flex items-center gap-4 text-[28px]">
              <X className="size-7 shrink-0 text-[var(--brand)]" />
              <span className="pt-strike" style={{ '--d2': `${1700 + i * 260}ms` } as CSSProperties}>
                {p}
              </span>
            </li>
          </In>
        ))}
      </ul>
      <In fx="up" delay={2700} className="mt-10 w-[720px]">
        <p className="text-[32px] leading-tight font-semibold">
          OlympAI — всё в одном месте. <span className="pt-ink">Бесплатно.</span>
        </p>
      </In>

      {/* Right column: the particles write the task count at stage (1180, 330). */}
      <In fx="up" delay={1400} className="absolute top-[340px] left-[760px] w-[620px] text-center">
        <p className="pt-lead">задач из настоящих олимпиад</p>
      </In>
      <div className="absolute top-[430px] left-[760px] grid w-[620px] grid-cols-3 gap-4">
        {[
          { v: String(olympiads), l: 'олимпиад' },
          { v: '2', l: 'предмета' },
          { v: '3', l: 'языка' },
        ].map((s, i) => (
          <In key={s.l} fx="flip" delay={1600 + i * 180}>
            <div className="pt-card px-6 py-7 text-center">
              <div className="font-display text-[64px] leading-none font-semibold">
                <Odometer value={s.v} active={active} delay={1800 + i * 200} />
              </div>
              <div className="mt-3 text-[20px] text-[var(--muted-foreground)]">{s.l}</div>
            </div>
          </In>
        ))}
      </div>
    </div>
  )
}

function SlideProduct({ active, onTheme, dark }: { active: boolean; onTheme: (e: React.MouseEvent) => void; dark: boolean }) {
  const lines: { text: string; mark: 'ok' | 'gap' | 'error'; note?: string }[] = [
    { text: 'mg sin α − F_тр = ma', mark: 'ok' },
    { text: 'N = mg cos α', mark: 'ok' },
    { text: 'F_тр = μN', mark: 'gap', note: 'Скажи, что брусок скользит' },
    { text: 'a = g (sin α + μ cos α)', mark: 'error', note: 'Ошибка в знаке: трение вверх' },
  ]
  const Icon = { ok: Check, gap: Minus, error: X }
  const tone = { ok: 'text-[var(--success)]', gap: 'text-[var(--warning)]', error: 'text-[var(--destructive)]' }
  const t = useClock(active)
  const full = 'Вверх вдоль плоскости — против скольжения.'
  const answer = full.slice(0, Math.max(0, Math.floor((t - 6200) / 34)))
  const replied = t >= 8300
  const thinking = t >= 7800 && !replied
  const C = 2 * Math.PI * 34

  return (
    <div className="relative h-full">
      <In fx="left" className="pt-kicker">02 · Опыт ученика</In>
      <In delay={150} className="mt-5">
        <h2 className="pt-h2">
          Проверка как у жюри. <span className="pt-ink">Подсказка, а не ответ.</span>
        </h2>
      </In>

      <div className="mt-10 grid grid-cols-[640px_1fr] gap-10">
        {/* Line-by-line check */}
        <In fx="up" delay={400}>
          <figure className="pt-card relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-7 py-4 text-[20px]">
              <span className="font-medium">Брусок на наклонной плоскости</span>
              <span className="font-mono text-[15px] text-[var(--muted-foreground)]">проверка ИИ</span>
            </div>
            <ol className="divide-y divide-[var(--border)]">
              {lines.map((l, i) => {
                const I = Icon[l.mark]
                return (
                  <li key={l.text} className="flex gap-4 px-7 py-4">
                    <span className="w-5 pt-1 text-right font-mono text-[15px] text-[var(--muted-foreground)]">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[24px]">{l.text}</p>
                      {l.note ? (
                        <div className="pt-note" style={d(1500 + i * 520)}>
                          <p className={`pt-1 text-[18px] ${tone[l.mark]}`}>{l.note}</p>
                        </div>
                      ) : null}
                    </div>
                    <span className="pt-mark" style={d(1300 + i * 520)}>
                      <I className={`size-7 ${tone[l.mark]}`} strokeWidth={2.6} />
                    </span>
                  </li>
                )
              })}
            </ol>
            <figcaption className="flex items-center gap-5 border-t border-[var(--border)] px-7 py-5">
              <svg viewBox="0 0 80 80" className="size-[78px] -rotate-90">
                <circle cx="40" cy="40" r="34" stroke="var(--border)" strokeWidth="7" fill="none" />
                <circle
                  className="pt-ring-arc"
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="var(--brand)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={C}
                  strokeDashoffset={active ? C * (1 - 4 / 7) : C}
                />
              </svg>
              <div>
                <div className="text-[40px] leading-none font-semibold tabular-nums">
                  <Odometer value="4" active={active} delay={3400} />
                  <span className="text-[22px] text-[var(--muted-foreground)]"> / 7</span>
                </div>
                <div className="mt-1 text-[18px] text-[var(--muted-foreground)]">балл по схеме жюри, за каждую строку</div>
              </div>
            </figcaption>
            <div className="pt-scan" />
          </figure>
        </In>

        {/* Sulu */}
        <div className="relative">
          <In fx="pop" delay={4600} className="absolute -top-6 right-2">
            <div className="pt-float relative">
              <div aria-hidden className="absolute inset-0 rounded-full bg-[var(--brand)] opacity-40 blur-2xl" />
              <SuluGlyph className="relative size-[96px]" />
            </div>
          </In>
          <In fx="right" delay={4800}>
            <div className="pt-card mt-16 space-y-4 p-6 text-[21px] leading-snug">
              <div className="flex items-center gap-3 text-[17px] text-[var(--muted-foreground)]">
                <SuluGlyph className="size-6" /> Sulu
              </div>
              <p className="max-w-[90%] rounded-2xl rounded-tl-sm bg-[var(--muted)] px-5 py-3">
                Куда направлено трение, если брусок едет вниз?
              </p>
              <p className="ml-auto min-h-[56px] max-w-[88%] rounded-2xl rounded-tr-sm bg-[var(--primary)] px-5 py-3 text-[var(--primary-foreground)]">
                <span className={answer.length && !replied ? 'pt-caret' : ''}>{answer || ' '}</span>
              </p>
              <div className="min-h-[56px]">
                {thinking ? (
                  <div className="pt-dots inline-flex rounded-2xl bg-[var(--muted)] px-5 py-4">
                    <i />
                    <i />
                    <i />
                  </div>
                ) : replied ? (
                  <p className="max-w-[90%] animate-in fade-in slide-in-from-bottom-3 zoom-in-95 rounded-2xl rounded-tl-sm bg-[var(--brand-soft)] px-5 py-3 duration-500">
                    <b>Именно.</b> Теперь проверь знак в строке 4.
                  </p>
                ) : null}
              </div>
            </div>
          </In>
          <In fx="up" delay={5200} className="mt-5 flex items-center gap-2 text-[17px] text-[var(--muted-foreground)]">
            {['Намёк', 'Идея', 'Шаг', 'Решение — по запросу'].map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                {i ? <ChevronRight className="size-4" /> : null}
                <span className={i === 3 ? 'text-[var(--foreground)]' : ''}>{s}</span>
              </span>
            ))}
          </In>
        </div>
      </div>

      <div className="absolute bottom-0 left-[680px] flex w-[700px] flex-wrap gap-3 text-[17px]">
        <In fx="pop" delay={900}>
          <span className="pt-card inline-flex items-center gap-2 px-5 py-3">
            <Camera className="size-5 text-[var(--brand)]" /> Фото тетради → текст
          </span>
        </In>
        <In fx="pop" delay={1050}>
          <span className="pt-card inline-flex items-center gap-2 px-5 py-3">
            <Languages className="size-5 text-[var(--brand)]" /> Русский · Қазақша · English
          </span>
        </In>
        <In fx="pop" delay={1200}>
          <button
            type="button"
            onClick={onTheme}
            className="pt-card inline-flex cursor-pointer items-center gap-2 px-5 py-3 transition-transform hover:scale-105"
          >
            {dark ? <Sun className="size-5 text-[var(--brand)]" /> : <Moon className="size-5 text-[var(--brand)]" />}
            Светлая и тёмная тема
          </button>
        </In>
      </div>
    </div>
  )
}

function Node({ x, y, w, title, sub, delay, glow }: { x: number; y: number; w: number; title: string; sub: string; delay: number; glow: number }) {
  return (
    <In fx="pop" delay={delay} className="absolute" style={{ left: x, top: y, width: w }}>
      <div className="pt-card pt-node px-6 py-5" style={{ '--g': `${glow}s` } as CSSProperties}>
        <div className="text-[25px] font-semibold">{title}</div>
        <div className="mt-1 text-[18px] text-[var(--muted-foreground)]">{sub}</div>
      </div>
    </In>
  )
}

function SlideTech() {
  // Wire paths in diagram coordinates (1380 x 360).
  const wires = [
    { p: 'M250 190 C 320 190, 330 190, 420 190', d: 900 },
    { p: 'M760 170 C 860 170, 880 70, 990 70', d: 1500 },
    { p: 'M760 210 C 860 210, 880 300, 990 300', d: 1700 },
  ]
  const chips = ['TypeScript strict', '38 000+ строк кода', '48 миграций БД', 'Row-Level Security', 'Rate limiting', 'HSTS и защитные заголовки']
  return (
    <div className="relative h-full">
      <In fx="left" className="pt-kicker">03 · Технологии</In>
      <In delay={150} className="mt-5">
        <h2 className="pt-h2">
          Продакшен-стек, <span className="pt-ink">а не прототип</span>
        </h2>
      </In>

      <div className="absolute top-[200px] left-0 h-[360px] w-[1380px]">
        <svg className="absolute inset-0 overflow-visible" width="1380" height="360" fill="none">
          {wires.map((w) => (
            <g key={w.p}>
              <path className="pt-wire" d={w.p} stroke="var(--border-strong)" strokeWidth="3" style={d(w.d)} />
              <path className="pt-flow" d={w.p} stroke="var(--brand)" strokeWidth="3" opacity="0.8" />
              {[0, 0.7, 1.4].map((b) => (
                <circle key={b} r="6" fill="var(--brand)" style={{ filter: 'drop-shadow(0 0 8px var(--brand))' }}>
                  <animateMotion dur="2.1s" begin={`${b}s`} repeatCount="indefinite" path={w.p} />
                </circle>
              ))}
            </g>
          ))}
        </svg>
        <Node x={0} y={130} w={250} title="Ученик" sub="браузер · телефон · Telegram" delay={500} glow={0} />
        <Node x={420} y={110} w={340} title="Next.js 16 · React 19" sub="Server Components · Server Actions" delay={1100} glow={0.7} />
        <Node x={990} y={0} w={390} title="PostgreSQL (PGlite)" sub="RLS · миграции · сессии" delay={1700} glow={1.4} />
        <Node x={990} y={230} w={390} title="ИИ-проверка и Sulu" sub="OpenAI · оценка по схеме жюри" delay={1900} glow={2.1} />
      </div>

      <div className="absolute bottom-0 left-0 flex w-[1380px] flex-wrap gap-3">
        {chips.map((c, i) => (
          <In key={c} fx="drop" delay={2400 + i * 140}>
            <span className="pt-card inline-flex items-center gap-2 px-5 py-3 font-mono text-[18px]">
              <Check className="size-5 text-[var(--success)]" /> {c}
            </span>
          </In>
        ))}
      </div>
    </div>
  )
}

function SlideReady() {
  const checks = ['next build', 'typecheck · lint', 'HTTPS', 'регистрация открыта']
  return (
    <div className="flex h-full flex-col items-center text-center">
      <In fx="left" className="pt-kicker">04 · Готовность</In>
      <In delay={150} className="mt-5 flex items-center gap-5">
        <span className="pt-live" />
        <h2 className="pt-h2">Уже работает. Прямо сейчас.</h2>
      </In>
      {/* The particles write "olympai.kz" at y = 380. */}
      <div className="h-[290px]" />
      <div className="flex gap-3">
        {checks.map((c, i) => (
          <In key={c} fx="pop" delay={1800 + i * 220}>
            <span className="pt-card inline-flex items-center gap-2 px-5 py-3 font-mono text-[19px]">
              <Check className="size-5 text-[var(--success)]" /> {c}
            </span>
          </In>
        ))}
      </div>
      <In fx="blur" delay={3000} className="mt-16">
        <p className="pt-h1">
          Думай глубже. <span className="pt-ink">Тренируйся умнее.</span>
        </p>
      </In>
      <In delay={3600} className="mt-6">
        <p className="pt-lead">Спасибо!</p>
      </In>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

export function PitchDeck({ tasks, olympiads }: Props) {
  const formations: Formation[] = useMemo(() => [
    { kind: 'text', text: 'OlympAI', x: 800, y: 400, size: 270, serif: true },
    { kind: 'text', text: `${tasks}+`, x: 1180, y: 330, size: 210 },
    { kind: 'drift' },
    { kind: 'drift' },
    { kind: 'text', text: 'olympai.kz', x: 800, y: 380, size: 200 },
  ], [tasks])
  const total = formations.length

  const [idx, setIdx] = useState(0)
  const [dark, setDark] = useState(true)
  const [idle, setIdle] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fieldRef = useRef<ParticleField | null>(null)
  const formationsRef = useRef(formations)
  useEffect(() => {
    formationsRef.current = formations
  }, [formations])

  const go = useCallback(
    (n: number) => setIdx((cur) => {
      const next = Math.max(0, Math.min(total - 1, n))
      return next === cur ? cur : next
    }),
    [total],
  )

  // Start on the slide named in the hash, so a reload keeps your place.
  useEffect(() => {
    const n = Number(window.location.hash.slice(1))
    if (!(n >= 1 && n <= total)) return
    const raf = requestAnimationFrame(() => setIdx(n - 1))
    return () => cancelAnimationFrame(raf)
  }, [total])

  const idxRef = useRef(0)
  useEffect(() => {
    idxRef.current = idx
    history.replaceState(null, '', `#${idx + 1}`)
    fieldRef.current?.set(formationsRef.current[idx])
  }, [idx])

  // The deck opens in dark; the visitor's own theme comes back on leaving.
  useEffect(() => {
    const html = document.documentElement
    const wasDark = html.classList.contains('dark')
    html.classList.add('dark')
    html.style.colorScheme = 'dark'
    return () => {
      html.classList.toggle('dark', wasDark)
      html.style.colorScheme = wasDark ? 'dark' : 'light'
    }
  }, [])

  const syncColors = useCallback(() => {
    const css = getComputedStyle(document.documentElement)
    const isDark = document.documentElement.classList.contains('dark')
    fieldRef.current?.setTheme(isDark, css.getPropertyValue('--brand').trim(), css.getPropertyValue('--foreground').trim())
  }, [])

  // Particles, stage scale, pointer.
  useEffect(() => {
    const canvas = canvasRef.current!
    const field = new ParticleField(canvas)
    fieldRef.current = field
    syncColors()

    const fit = () => {
      const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)
      rootRef.current?.style.setProperty('--s', String(s))
      field.resize()
    }
    fit()
    // The display serif loads lazily; rebuild the word once it is in.
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-literata').trim()
    document.fonts
      .load(`600 100px ${family}`)
      .then(() => document.fonts.ready)
      .then(() => field.set(formationsRef.current[idxRef.current], false))
      .catch(() => {})

    let idleTimer: ReturnType<typeof setTimeout>
    const onMove = (e: PointerEvent) => {
      field.pointer(e.clientX, e.clientY)
      setIdle(false)
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => setIdle(true), 2500)
    }
    const onLeave = () => field.pointer(-9999, -9999)
    window.addEventListener('resize', fit)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      field.destroy()
      clearTimeout(idleTimer)
      window.removeEventListener('resize', fit)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [syncColors])

  const toggleTheme = useCallback(
    (x?: number, y?: number) => {
      const html = document.documentElement
      const flip = () => {
        const next = !html.classList.contains('dark')
        html.classList.toggle('dark', next)
        html.style.colorScheme = next ? 'dark' : 'light'
        setDark(next)
        syncColors()
      }
      html.style.setProperty('--pt-wx', `${x ?? window.innerWidth / 2}px`)
      html.style.setProperty('--pt-wy', `${y ?? window.innerHeight / 2}px`)
      if (!('startViewTransition' in document)) return flip()
      html.classList.add('pt-vt')
      const vt = document.startViewTransition(flip)
      vt.finished.finally(() => html.classList.remove('pt-vt'))
    },
    [syncColors],
  )

  const fullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen().catch(() => {})
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault()
        go(idx + 1)
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) {
        e.preventDefault()
        go(idx - 1)
      } else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(total - 1)
      else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') fullscreen()
      else if (e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') toggleTheme()
      else if (/^[1-5]$/.test(e.key)) go(Number(e.key) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, go, total, fullscreen, toggleTheme])

  // Touch: a horizontal swipe moves a slide.
  const touch = useRef<number | null>(null)

  const onClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('button, a')) return
    go(e.clientX < window.innerWidth / 3 ? idx - 1 : idx + 1)
  }

  return (
    <div
      ref={rootRef}
      className={`pt-root ${idle ? 'pt-idle' : ''}`}
      onClick={onClick}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return
        const dx = e.changedTouches[0].clientX - touch.current
        touch.current = null
        if (Math.abs(dx) > 50) go(dx < 0 ? idx + 1 : idx - 1)
      }}
    >
      <div className="pt-aurora" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className="pt-grid" aria-hidden />
      <canvas ref={canvasRef} className="pt-canvas" aria-hidden />

      <div className="pt-stage">
        {[
          <SlideIntro key="intro" />,
          <SlideUtility key="utility" active={idx === 1} olympiads={olympiads} />,
          <SlideProduct key="product" active={idx === 2} dark={dark} onTheme={(e) => toggleTheme(e.clientX, e.clientY)} />,
          <SlideTech key="tech" />,
          <SlideReady key="ready" />,
        ].map((slide, i) => (
          <section
            key={i}
            aria-hidden={i !== idx}
            className={`pt-slide ${i === idx ? 'is-active' : i < idx ? 'is-past' : ''}`}
          >
            {slide}
          </section>
        ))}
      </div>

      {/* Presenter chrome, hidden while the pointer rests. */}
      <div className="pt-chrome right-6 bottom-5 flex items-center gap-2 font-mono text-[13px] text-[var(--muted-foreground)]">
        <button type="button" onClick={() => go(idx - 1)} className="rounded-lg p-2 hover:bg-[var(--muted)]" aria-label="Назад">
          <ChevronLeft className="size-4" />
        </button>
        <span className="tabular-nums">
          {idx + 1} / {total}
        </span>
        <button type="button" onClick={() => go(idx + 1)} className="rounded-lg p-2 hover:bg-[var(--muted)]" aria-label="Вперёд">
          <ChevronRight className="size-4" />
        </button>
        <button type="button" onClick={(e) => toggleTheme(e.clientX, e.clientY)} className="rounded-lg p-2 hover:bg-[var(--muted)]" aria-label="Тема">
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <button type="button" onClick={fullscreen} className="rounded-lg p-2 hover:bg-[var(--muted)]" aria-label="Во весь экран">
          <Expand className="size-4" />
        </button>
      </div>
      <div className="pt-progress" style={{ width: `${((idx + 1) / total) * 100}%` }} />
    </div>
  )
}
