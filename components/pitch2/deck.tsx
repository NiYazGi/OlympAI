'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Expand, Minus, X } from 'lucide-react'
import { BrandGlyph, SuluGlyph } from '@/components/brand-mark'
import { Field, STAGE_H, STAGE_W } from './field'
import './deck.css'

/**
 * Nine slides in a formal register: the particles move between formations and
 * the content settles in, with nothing flashing or shaking. Arrows, space,
 * PageUp/PageDown or a click move between slides, 1-9 jump, F goes full screen.
 */

const TOTAL = 9

const vars = (o: Record<string, string | number>) => o as CSSProperties
const BASE = 260

/** A headline whose letters rise into place one after another. */
function Heading({ text, delay = 0, accent }: { text: string; delay?: number; accent?: boolean }) {
  let n = 0
  return (
    <span style={accent ? { color: 'var(--coral)' } : undefined}>
      {text.split(' ').map((word, w) => (
        <span key={w}>
          {w > 0 ? ' ' : null}
          <span className="p2-word">
            {word.split('').map((ch, c) => (
              <span key={c} className="p2-ch" style={vars({ '--d': `${BASE + delay + n++ * 14}ms` })}>
                {ch}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  )
}

function At({ x, y, w, h, center, children, style }: { x: number; y: number; w?: number; h?: number; center?: boolean; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className={`p2-at ${center ? 'text-center' : ''}`} style={{ left: x, top: y, width: w, height: h, ...style }}>
      {children}
    </div>
  )
}

function In({ fx = 'up', delay = 0, className = '', style, children }: { fx?: string; delay?: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div data-fx={fx} className={`p2-in ${className}`} style={{ ...style, ...vars({ '--d': `${BASE + delay}ms` }) }}>
      {children}
    </div>
  )
}

function Roll({ value, active, delay = 0 }: { value: string; active: boolean; delay?: number }) {
  return (
    <span className="p2-roll">
      {value.split('').map((ch, i) =>
        /\d/.test(ch) ? (
          <span
            key={i}
            style={{
              transform: `translateY(${active ? -(Number(ch) + 10) : 0}em)`,
              transitionDelay: active ? `${BASE + delay + i * 110}ms` : '0ms',
            }}
          >
            {[...'01234567890123456789'].map((d, j) => (
              <i key={j}>{d}</i>
            ))}
          </span>
        ) : (
          <i key={i}>{ch}</i>
        ),
      )}
    </span>
  )
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <In fx="left" delay={60}>
      <p className="p2-kicker">{children}</p>
    </In>
  )
}

/* Slides ------------------------------------------------------------------ */

function S1() {
  return (
    <>
      {/* OLYMP and AI themselves are written by the particles. */}
      <At x={530} y={585} w={660}>
        <In fx="left" delay={1500}>
          <p className="p2-serif p2-shadow text-[38px] leading-[1.15]">Операционная система подготовки к олимпиадам на ИИ</p>
        </In>
        <In fx="up" delay={1900} className="mt-7">
          <p className="p2-shadow font-mono text-[15px] tracking-[0.2em] text-[var(--coral)] uppercase">Presented by</p>
          <p className="p2-shadow mt-2 text-[25px] font-semibold">Zhumaniyaz Gizatuly, Urazalinov Samir</p>
        </In>
      </At>
      <At x={1225} y={530}>
        <In fx="pop" delay={2200}>
          <div className="p2-float relative">
            <div aria-hidden className="absolute inset-0 rounded-full bg-[var(--coral)] opacity-40 blur-3xl" />
            <SuluGlyph className="relative size-[270px]" />
          </div>
        </In>
      </At>
    </>
  )
}

function S2() {
  const parts = ['Теория', 'Задачи', 'Прогресс', 'Учитель']
  const xs = [230, 610, 990, 1370]
  return (
    <>
      <At x={110} y={70}>
        <Kicker>Проблема</Kicker>
      </At>
      <At x={110} y={118} w={1380}>
        <h2 className="p2-h">
          <Heading text="Олимпиадный талант растят" /> <Heading text="вручную" delay={560} accent />
        </h2>
      </At>
      <At x={110} y={322} w={1100}>
        <In delay={1100}>
          <p className="p2-lead p2-shadow">Будущие победители сходят ещё на подготовке: единой системы нет.</p>
        </In>
      </At>
      {xs.map((x, i) => (
        <At key={parts[i]} x={x - 130} y={590} w={260} center>
          <In fx="pop" delay={1300 + i * 150}>
            <p className="p2-shadow text-[34px] font-bold">{parts[i]}</p>
          </In>
        </At>
      ))}
      {xs.slice(0, 3).map((x, i) => (
        <At key={x} x={x + 125} y={614} w={130}>
          <div className="p2-gap" style={vars({ '--d': `${1900 + i * 150}ms` })} />
          <div className="absolute top-[-16px] left-[49px]">
            <In fx="pop" delay={2200 + i * 150}>
              <X className="size-8 text-[var(--coral)]" strokeWidth={3.2} />
            </In>
          </div>
        </At>
      ))}
    </>
  )
}

function S3({ active }: { active: boolean }) {
  const lines: { text: string; mark: 'ok' | 'gap' | 'bad'; note?: string }[] = [
    { text: 'mg sin α − F_тр = ma', mark: 'ok' },
    { text: 'N = mg cos α', mark: 'ok' },
    { text: 'F_тр = μN', mark: 'gap', note: 'Скажи, что брусок скользит' },
    { text: 'a = g (sin α + μ cos α)', mark: 'bad', note: 'Здесь сбой: трение направлено вверх' },
  ]
  const Icon = { ok: Check, gap: Minus, bad: X }
  const tone = { ok: 'var(--ok)', gap: 'var(--warn)', bad: 'var(--bad)' }
  const C = 2 * Math.PI * 34
  const steps = ['Цель', 'Тренировка', 'ИИ-проверка', 'Прогресс']
  return (
    <>
      <At x={110} y={62}>
        <Kicker>Решение</Kicker>
      </At>
      <At x={110} y={108} w={1000}>
        <h2 className="p2-h !text-[72px]">
          <Heading text="Каждое решение —" /> <Heading text="это данные" delay={420} accent />
        </h2>
      </At>
      <At x={110} y={290} w={700}>
        <In fx="flip" delay={900}>
          <figure className="p2-card relative overflow-hidden">
            <ol>
              {lines.map((l, i) => {
                const I = Icon[l.mark]
                return (
                  <li key={l.text} className="flex items-start gap-4 border-b border-[var(--line)] px-7 py-[14px]">
                    <div className="min-w-0 flex-1">
                      <p className="p2-serif text-[26px]">{l.text}</p>
                      {l.note ? (
                        <p className="p2-in text-[19px]" data-fx="left" style={vars({ color: tone[l.mark], '--d': `${2000 + i * 420}ms` })}>
                          {l.note}
                        </p>
                      ) : null}
                    </div>
                    <span className="p2-tick" style={vars({ '--d': `${1700 + i * 420}ms` })}>
                      <I className="size-8" style={{ color: tone[l.mark] }} strokeWidth={3} />
                    </span>
                  </li>
                )
              })}
            </ol>
            <figcaption className="flex items-center gap-5 px-7 py-4">
              <svg viewBox="0 0 80 80" className="size-[68px] -rotate-90">
                <circle cx="40" cy="40" r="34" stroke="var(--line)" strokeWidth="8" fill="none" />
                <circle
                  className="p2-arc"
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="var(--coral)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={C}
                  strokeDashoffset={active ? C * (1 - 4 / 7) : C}
                />
              </svg>
              <p className="text-[38px] font-bold">
                4<span className="text-[22px] text-[var(--mute)]"> / 7</span>
              </p>
              <p className="text-[20px] text-[var(--mute)]">по схеме жюри</p>
            </figcaption>
            <div className="p2-scan" />
          </figure>
        </In>
      </At>
      <At x={110} y={788} w={1380}>
        <div className="flex items-center gap-4 text-[28px] font-semibold">
          {steps.map((s, i) => (
            <span key={s} className="flex items-center gap-4">
              {i > 0 ? (
                <In fx="pop" delay={3700 + i * 200}>
                  <ArrowRight className="size-7 text-[var(--coral)]" strokeWidth={3} />
                </In>
              ) : null}
              <In fx="flop" delay={3600 + i * 200}>
                <span className="p2-card inline-block px-6 py-3">{s}</span>
              </In>
            </span>
          ))}
        </div>
      </At>
    </>
  )
}

function S4() {
  const cards = [
    { h: 'Эксперт в любой момент', b: 'Читает всё решение, а не только ответ.' },
    { h: 'Без готовых ответов', b: 'Намёк, идея, шаг. Ученик доходит сам.' },
    { h: 'Больше, чем банк задач', b: 'Тренировки, ИИ-проверка, прогресс и пробные туры.' },
  ]
  return (
    <>
      <At x={110} y={58}>
        <Kicker>Наше отличие</Kicker>
      </At>
      <At x={110} y={100} w={1380}>
        <h2 className="p2-h !text-[72px]">
          <Heading text="Видим, где рассуждение" /> <Heading text="сломалось" delay={480} accent />
        </h2>
      </At>
      <At x={953} y={284}>
        <div className="p2-break" />
      </At>
      <At x={1015} y={232}>
        <In fx="right" delay={1700}>
          <p className="p2-shadow font-mono text-[21px] text-[var(--coral)]">первый сбой</p>
        </In>
      </At>
      {cards.map((c, i) => (
        <At key={c.h} x={110 + i * 472} y={470} w={436}>
          <In fx="flip" delay={1300 + i * 240}>
            <div className={`p2-card h-[330px] p-9 ${i === 1 ? 'p2-hot' : ''}`}>
              <p className="p2-serif text-[62px] leading-none text-[var(--coral)]">0{i + 1}</p>
              <p className="mt-6 text-[36px] leading-[1.1] font-bold">{c.h}</p>
              <p className="mt-4 text-[25px] leading-snug text-[var(--mute)]">{c.b}</p>
            </div>
          </In>
        </At>
      ))}
    </>
  )
}

function SStack() {
  const rows = [
    { l: 'Интерфейс', t: ['Next.js 16', 'React 19', 'Tailwind CSS 4', 'KaTeX'] },
    { l: 'Сервер', t: ['Server Components', 'Server Actions', 'TypeScript strict'] },
    { l: 'Данные', t: ['PostgreSQL (PGlite)', 'Row-Level Security', '48 миграций'] },
    { l: 'ИИ', t: ['Смена модели без релиза', 'Ответы по JSON-схеме', 'Учёт токенов'] },
    { l: 'Запуск', t: ['Свой сервер', 'Caddy и HTTPS', 'Telegram-бот'] },
  ]
  return (
    <>
      <At x={110} y={58}>
        <Kicker>Технологии</Kicker>
      </At>
      <At x={110} y={100} w={1380}>
        <h2 className="p2-h !text-[72px]">
          <Heading text="Технологический" /> <Heading text="стек" delay={260} accent />
        </h2>
      </At>
      {rows.map((r, i) => (
        <At key={r.l} x={110} y={236 + i * 116} w={960}>
          <In fx="left" delay={700 + i * 170}>
            <div className="p2-card flex h-[100px] items-center gap-6 px-7">
              <p className="w-[160px] shrink-0 text-[28px] font-bold">{r.l}</p>
              <p className="text-[21px] leading-tight text-[var(--mute)]">
                {r.t.map((x, j) => (
                  <span key={x}>
                    {j > 0 ? <span className="px-2 text-[var(--coral)]">·</span> : null}
                    <span className="whitespace-nowrap">{x}</span>
                  </span>
                ))}
              </p>
            </div>
          </In>
        </At>
      ))}
      <At x={1100} y={134} w={390}>
        <In delay={1700}>
          <p className="text-right font-mono text-[18px] text-[var(--mute)]">40 000+ строк TypeScript</p>
        </In>
      </At>
    </>
  )
}

function S5({ active }: { active: boolean }) {
  const tiers = [
    { n: 'Free', p: '0', b: 'Часть теории и задач' },
    { n: 'Pro', p: '20', b: 'Вся библиотека, ИИ-проверка, Sulu', hot: true },
    { n: 'Elite', p: '50', b: 'Аналитика и стратегия под тур' },
  ]
  return (
    <>
      <At x={110} y={58}>
        <Kicker>Рынок и модель</Kicker>
      </At>
      <At x={110} y={100} w={1380}>
        <h2 className="p2-h !text-[58px]">
          <Heading text="B2C + B2B2C" accent />
        </h2>
      </At>
      <At x={250} y={208} w={300} center>
        <In fx="slam" delay={1000}>
          <p className="p2-shadow text-[46px] leading-none font-black">
            $<Roll value="240" active={active} delay={1000} />M
          </p>
          <p className="p2-shadow mt-1 text-[19px] text-[var(--mute)]">TAM · ~1M учеников</p>
        </In>
      </At>
      <At x={270} y={368} w={260} center>
        <In fx="slam" delay={1350}>
          <p className="p2-shadow text-[38px] leading-none font-black">
            $<Roll value="60" active={active} delay={1350} />M
          </p>
          <p className="p2-shadow mt-1 text-[17px] text-[var(--mute)]">SAM · ~250K</p>
        </In>
      </At>
      <At x={270} y={566} w={260} center>
        <In fx="slam" delay={1700}>
          <p className="p2-shadow text-[38px] leading-none font-black text-[var(--coral)]">
            $<Roll value="3" active={active} delay={1700} />M
          </p>
          <p className="p2-shadow mt-1 text-[17px] text-[var(--mute)]">SOM · 10K платящих</p>
        </In>
      </At>
      <At x={110} y={838} w={700}>
        <In delay={2100}>
          <p className="text-[17px] text-[var(--mute)]">Оценка снизу вверх по данным участия в олимпиадах</p>
        </In>
      </At>
      {tiers.map((t, i) => (
        <At key={t.n} x={840 + i * 222} y={210} w={208}>
          <In fx="flip" delay={1900 + i * 200}>
            <div className={`p2-card h-[380px] p-6 ${t.hot ? 'p2-hot' : ''}`}>
              <p className="text-[28px] font-bold">{t.n}</p>
              <p className="mt-5 text-[66px] leading-none font-black">
                ${t.p}
              </p>
              <p className="mt-1 text-[19px] text-[var(--mute)]">/ мес</p>
              <p className="mt-6 text-[22px] leading-snug text-[var(--mute)]">{t.b}</p>
            </div>
          </In>
        </At>
      ))}
      <At x={840} y={620} w={654}>
        <In fx="up" delay={2700}>
          <div className="p2-card space-y-3 p-6 text-[26px]">
            <p>
              <b>Ученики</b> <span className="text-[var(--mute)]">$20 / мес</span>
            </p>
            <p>
              <b>Учителя</b> <span className="text-[var(--mute)]">$30–50 / мес</span>
            </p>
            <p>
              <b>Школы</b> <span className="text-[var(--mute)]">годовые контракты</span>
            </p>
          </div>
        </In>
      </At>
    </>
  )
}

function S6() {
  const nodes = ['Ученики', 'Данные', 'Диагноз', 'Подготовка', 'Результат']
  const cx = 460
  const cy = 480
  const R = 258
  const moats = [
    { h: 'Данные', b: 'Как олимпиадники думают и ошибаются' },
    { h: 'Методика', b: 'Проверка, тренировка и подготовка к туру в одном' },
    { h: 'Дистрибуция', b: 'Ученик → учитель → школа' },
  ]
  return (
    <>
      <At x={110} y={58}>
        <Kicker>Почему победим</Kicker>
      </At>
      <At x={880} y={150} w={620}>
        <h2 className="p2-h !text-[64px]">
          <Heading text="Система," /> <Heading text="а не ещё один чат-бот" delay={220} accent />
        </h2>
      </At>
      {nodes.map((n, i) => {
        const a = -Math.PI / 2 + (i / nodes.length) * Math.PI * 2
        return (
          <At key={n} x={cx + Math.cos(a) * R - 100} y={cy + Math.sin(a) * R - 34} w={200} center>
            <In fx="pop" delay={1200 + i * 170}>
              <div className="p2-card p2-node inline-block px-6 py-3 text-[26px] font-bold" style={vars({ '--g': `${2.6 + i}s` })}>
                {n}
              </div>
            </In>
          </At>
        )
      })}
      <At x={cx - 90} y={cy - 70}>
        <In fx="pop" delay={2100}>
          <BrandGlyph className="size-[180px]" />
        </In>
      </At>
      {moats.map((m, i) => (
        <At key={m.h} x={880} y={500 + i * 112} w={620}>
          <In fx="right" delay={1700 + i * 200}>
            <p className="text-[32px] font-bold">{m.h}</p>
            <p className="text-[24px] text-[var(--mute)]">{m.b}</p>
          </In>
        </At>
      ))}
    </>
  )
}

function S7({ tasks }: { tasks: string }) {
  const cols = [
    { t: 'Сейчас', s: 'Продукт', x: 110, y: 400, items: ['Работает на olympai.kz', 'ИИ-проверка решений', 'Sulu — ИИ-тренер', 'Тренировки и пробные туры', `${tasks}+ задач, 2 предмета`], done: true },
    { t: '2026', s: 'Проверка', x: 590, y: 300, items: ['Первые 20 олимпиадников', 'Точность проверки и рост', 'Больше задач, права на контент', 'Запуск платного Pro'] },
    { t: '2027', s: 'Рост', x: 1070, y: 196, items: ['1 000+ платящих', 'Платформа для учителей', 'Первые школы', 'Новые предметы и рынки'] },
  ]
  return (
    <>
      <At x={110} y={58}>
        <Kicker>Вехи</Kicker>
      </At>
      <At x={110} y={100} w={900}>
        <h2 className="p2-h !text-[84px]">
          <Heading text="Уже работает." />
        </h2>
      </At>
      <At x={110} y={194} w={900}>
        <h2 className="p2-h !text-[84px]">
          <Heading text="Дальше — школы" delay={320} accent />
        </h2>
      </At>
      {cols.map((c, i) => (
        <At key={c.t} x={c.x} y={c.y} w={420}>
          <In fx="flop" delay={1200 + i * 380}>
            <div className={`p2-card p-7 ${c.done ? 'p2-hot' : ''}`}>
              <p className="p2-serif text-[58px] leading-none">{c.t}</p>
              <p className="mt-1 font-mono text-[18px] tracking-[0.2em] text-[var(--coral)] uppercase">{c.s}</p>
              <ul className="mt-4 space-y-1.5 text-[23px] leading-tight">
                {c.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    {c.done ? <Check className="mt-0.5 size-6 shrink-0 text-[var(--ok)]" strokeWidth={3} /> : <ArrowRight className="mt-0.5 size-6 shrink-0 text-[var(--coral)]" strokeWidth={2.6} />}
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          </In>
        </At>
      ))}
    </>
  )
}

function S8() {
  return (
    <>
      <div aria-hidden className="p2-at" style={{ left: 120, top: 150, width: 1360, height: 720, background: 'radial-gradient(ellipse at center, rgb(14 13 12 / 0.92) 34%, transparent 72%)' }} />
      <At x={200} y={228} w={1200} center>
        <h2 className="p2-h p2-shadow !text-[112px]">
          <Heading text="Давайте работать" /> <Heading text="вместе" delay={480} accent />
        </h2>
      </At>
      <At x={200} y={500} w={1200} center>
        <In fx="slam" delay={1500}>
          <p className="p2-serif p2-shadow text-[62px] text-[var(--coral)]">olympai.kz</p>
        </In>
      </At>
      <At x={200} y={620} w={1200} center>
        <In delay={1900}>
          <p className="p2-shadow font-mono text-[17px] tracking-[0.22em] text-[var(--coral)] uppercase">Presented by</p>
          <p className="p2-shadow mt-2 text-[36px] font-bold">Zhumaniyaz Gizatuly, Urazalinov Samir</p>
        </In>
      </At>
      <At x={200} y={745} w={1200} center>
        <In delay={2200}>
          <p className="p2-shadow text-[26px] text-[var(--mute)]">zhumaniyaz.gizatuly@olympai.kz · +7 (707) 511-0923</p>
        </In>
      </At>
    </>
  )
}

/* Deck -------------------------------------------------------------------- */

export function Deck({ tasks }: { tasks: string }) {
  const [idx, setIdx] = useState(0)
  const [idle, setIdle] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fieldRef = useRef<Field | null>(null)
  const idxRef = useRef(0)
  const firstHash = useRef<number | null>(null)

  // Engine, stage scale, pointer.
  useEffect(() => {
    const field = new Field(canvasRef.current!)
    fieldRef.current = field
    const fit = () => {
      rootRef.current?.style.setProperty('--s', String(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)))
      field.resize()
    }
    fit()

    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-sans-ui').trim() || 'sans-serif'
    document.fonts
      .load(`900 100px ${family}`)
      .catch(() => null)
      .then(() => {
        field.build(family)
        field.set(idxRef.current)
      })

    let timer: ReturnType<typeof setTimeout>
    const onMove = (e: PointerEvent) => {
      field.pointer(e.clientX, e.clientY)
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), 2200)
    }
    window.addEventListener('resize', fit)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      field.destroy()
      clearTimeout(timer)
      window.removeEventListener('resize', fit)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  // A link to #3 opens on that slide, and a reload keeps your place.
  useEffect(() => {
    firstHash.current ??= Number(window.location.hash.slice(1))
    const n = firstHash.current
    if (!(n >= 1 && n <= TOTAL)) return
    const raf = requestAnimationFrame(() => setIdx(n - 1))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    idxRef.current = idx
    history.replaceState(null, '', `#${idx + 1}`)
    fieldRef.current?.set(idx)
  }, [idx])

  const go = (n: number) => setIdx(Math.max(0, Math.min(TOTAL - 1, n)))
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen().catch(() => {})
  }

  // Keys are read through a ref so the listener never holds a stale slide number.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keyRef.current = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault()
        go(idx + 1)
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) {
        e.preventDefault()
        go(idx - 1)
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') fullscreen()
      else if (/^[1-9]$/.test(e.key)) go(Number(e.key) - 1)
    }
  })
  useEffect(() => {
    const on = (e: KeyboardEvent) => keyRef.current(e)
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const touch = useRef<number | null>(null)

  const slides = [
    <S1 key={0} />,
    <S2 key={1} />,
    <S3 key={2} active={idx === 2} />,
    <S4 key={3} />,
    <SStack key={4} />,
    <S5 key={5} active={idx === 5} />,
    <S6 key={6} />,
    <S7 key={7} tasks={tasks} />,
    <S8 key={8} />,
  ]

  return (
    <div
      ref={rootRef}
      className={`p2-root ${idle ? 'p2-idle' : ''}`}
      onClick={(e) => {
        if ((e.target as Element).closest('button, a')) return
        go(e.clientX < window.innerWidth / 3 ? idx - 1 : idx + 1)
      }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return
        const dx = e.changedTouches[0].clientX - touch.current
        touch.current = null
        if (Math.abs(dx) > 50) go(dx < 0 ? idx + 1 : idx - 1)
      }}
    >
      <canvas ref={canvasRef} className="p2-canvas" aria-hidden />
      <div className="p2-vignette" aria-hidden />

      <div className="p2-layer">
        <div className="p2-stage">
          {slides.map((slide, i) => (
            <section key={i} aria-hidden={i !== idx} className={`p2-slide ${i === idx ? 'on' : i > idx ? 'next' : ''}`}>
              {slide}
            </section>
          ))}
        </div>
      </div>

      <div className="p2-chrome flex items-center gap-1">
        <button type="button" onClick={() => go(idx - 1)} className="rounded-lg p-2" aria-label="Назад">
          <ChevronLeft className="size-4" />
        </button>
        <span className="tabular-nums">
          {idx + 1} / {TOTAL}
        </span>
        <button type="button" onClick={() => go(idx + 1)} className="rounded-lg p-2" aria-label="Вперёд">
          <ChevronRight className="size-4" />
        </button>
        <button type="button" onClick={fullscreen} className="rounded-lg p-2" aria-label="Во весь экран">
          <Expand className="size-4" />
        </button>
      </div>
      <div className="p2-bar" style={{ width: `${((idx + 1) / TOTAL) * 100}%` }} />
    </div>
  )
}
