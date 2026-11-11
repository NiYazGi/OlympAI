import type { CSSProperties } from 'react'
import { RunawayButton } from './runaway-button'
import './journal.css'

const W = 600
const H = 760

/** Position a box inside the 600×760 drawing, in percent so it scales with the page. */
function at(x: number, y: number, w?: number, rotate = 0): CSSProperties {
  return {
    left: `${(x / W) * 100}%`,
    top: `${(y / H) * 100}%`,
    width: w ? `${(w / W) * 100}%` : undefined,
    transform: rotate ? `rotate(${rotate}deg)` : undefined,
  }
}

const ALPHABET = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'
/** The cipher Dipper keeps finding at the bottom of pages: a plain Caesar shift. */
function caesar(text: string, shift: number) {
  return [...text]
    .map((ch) => {
      const i = ALPHABET.indexOf(ch)
      return i < 0 ? ch : ALPHABET[(i + shift) % ALPHABET.length]
    })
    .join('')
}

const SECRET = caesar('Я ЛЮБЛЮ САФИРУ', 3)

/** A pen stroke that draws itself. `d` is a hand-wobbled path. */
function Stroke({ d, color, delay, width = 3 }: { d: string; color: 'red' | 'blue' | 'brown'; delay: number; width?: number }) {
  return (
    <path
      d={d}
      pathLength={1}
      className={`sf-stroke sf-${color}`}
      style={{ animationDelay: `${delay}s`, strokeWidth: width }}
    />
  )
}

function Heart({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <path
      d="M0 8 C-14 -4 -6 -16 0 -7 C6 -16 14 -4 0 8 Z"
      transform={`translate(${x} ${y}) scale(${s})`}
      pathLength={1}
      className="sf-stroke sf-red sf-heart"
      style={{ animationDelay: `${delay}s` }}
    />
  )
}

const ENTRIES: { n: string; body: React.ReactNode }[] = [
  { n: '1', body: <>Сегодня увидел Сафиру. Записываю, пока не забыл, как дышать.</> },
  { n: '2', body: <>Подумал о ней. Потом ещё раз. Потом ещё. На четырёхсотом сбился со счёта.</> },
  {
    n: '3',
    body: (
      <>
        Это не <s>любовь</s> <s>одержимость</s> <span className="sf-circled">НАУКА</span>. Я просто{' '}
        <span className="sf-under">изучаю</span>. Внимательно. Каждый день. Из кустов.
      </>
    ),
  },
  { n: '4', body: <>Если она улыбнётся, я запишу это красным. Если не улыбнётся, всё равно красным.</> },
  { n: '5', body: <>Нарисовал карту мест, где мы могли бы случайно пересечься. Карта заняла стену. Стена кончилась.</> },
  { n: '6', body: <>Друзья говорят «успокойся». Не понимаю это слово. Смотрел в словаре. Там её фотографии нет.</> },
  { n: '7', body: <>Сердце бьётся странно. Проверил у врача. Врач сказал: «это просто Сафира». Гений.</> },
]

export function Journal() {
  return (
    <main className="sf-desk">
      <div className="sf-hearts" aria-hidden>
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i}>♥</span>
        ))}
      </div>

      <article className="sf-book">
        <header className="sf-cover-tag">
          <span className="sf-badge">3</span>
          <span>ЖУРНАЛ №3 · не показывать никому · ОСОБЕННО ЕЙ</span>
        </header>

        <div className="sf-spread">
          {/* Left page: the specimen */}
          <section className="sf-page sf-page-left">
            <div className="sf-stage">
              <p className="sf-note sf-scribble sf-small" style={at(18, 22, 260, -3)}>
                ОБЪЕКТ ИЗУЧЕНИЯ №1
                <br />
                <span className="sf-red-text">(единственный)</span>
              </p>

              <div className="sf-photo" style={at(150, 120, 300, 1.6)}>
                <i className="sf-tape sf-tape-l" />
                <i className="sf-tape sf-tape-r" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/safirafanpage/s.webp" alt="Сафира" width={900} height={1080} />
              </div>

              <p className="sf-note sf-blue-text" style={at(6, 126, 138, -4)}>
                её взгляд. я проверял. я больше не в порядке
              </p>
              <p className="sf-note sf-blue-text" style={at(458, 288, 138, 3)}>
                губы. без комментариев. (комментарии есть, 40 страниц)
              </p>
              <p className="sf-note sf-blue-text" style={at(6, 306, 132, -2)}>
                волосы. шёлк. я не то подумал
              </p>
              <p className="sf-note sf-blue-text" style={at(462, 404, 134, -3)}>
                плечо. тоже прекрасно?? (оно не умеет, но ВДРУГ)
              </p>
              <p className="sf-note sf-scribble sf-red-text sf-big" style={at(408, 100, 170, 6)}>
                ЭТО ОНА!!!
              </p>

              <p className="sf-name sf-scribble" style={at(70, 498, 460, -2)}>
                Сафира
              </p>
              <p className="sf-note sf-small sf-ink-text" style={at(110, 596, 400, -1)}>
                (имя записано в сердце. и ещё в телефоне. и на руке.)
              </p>

              <div className="sf-sticky" style={at(26, 630, 190, -5)}>
                купить цветы?? нет, слишком очевидно. купить 40.
              </div>
              <p className="sf-note sf-heart-carve" style={at(400, 628, 150, 4)}>
                С + Я
              </p>

              {/* Pen strokes: arrows, circle, underline, doodles. */}
              <svg className="sf-overlay" viewBox={`0 0 ${W} ${H}`} aria-hidden>
                {/* eyes arrow */}
                <Stroke color="blue" delay={1.6} d="M78 206 C120 236 190 240 236 222" />
                <Stroke color="blue" delay={2.3} width={3} d="M236 222 L220 208 M236 222 L216 232" />
                {/* lips arrow */}
                <Stroke color="blue" delay={2.0} d="M468 312 C430 322 372 300 328 280" />
                <Stroke color="blue" delay={2.7} d="M328 280 L346 280 M328 280 L336 296" />
                {/* hair arrow */}
                <Stroke color="blue" delay={2.4} d="M86 368 C110 384 150 372 176 350" />
                <Stroke color="blue" delay={3.0} d="M176 350 L160 352 M176 350 L172 366" />
                {/* shoulder arrow */}
                <Stroke color="blue" delay={2.8} d="M520 408 C490 392 462 394 430 380" />
                <Stroke color="blue" delay={3.3} d="M430 380 L448 376 M430 380 L440 394" />

                {/* red circle around the face, drawn twice like an angry pen */}
                <Stroke color="red" delay={1.0} width={3.5} d="M196 188 C228 150 330 148 366 190 C396 232 372 308 316 322 C250 336 196 300 190 246 C187 222 190 196 214 178" />
                <Stroke color="red" delay={1.5} width={2.5} d="M204 182 C250 142 352 160 372 214 C386 268 340 330 282 328 C222 324 188 278 194 236" />
                {/* arrow from ЭТО ОНА to the circle */}
                <Stroke color="red" delay={3.2} width={3.5} d="M452 130 C420 130 394 160 372 188" />
                <Stroke color="red" delay={3.6} width={3.5} d="M372 188 L376 168 M372 188 L392 186" />

                {/* name underline: a double wavy stroke */}
                <Stroke color="red" delay={4.0} width={4} d="M96 578 C150 566 200 590 260 574 C320 558 380 590 440 570 C470 562 490 572 508 566" />
                <Stroke color="red" delay={4.4} width={3} d="M120 590 C190 580 270 596 350 584 C400 578 440 588 476 580" />

                {/* doodles */}
                <Heart x={64} y={540} s={1.6} delay={4.8} />
                <Heart x={548} y={510} s={2} delay={5.0} />
                <Heart x={528} y={556} s={1} delay={5.2} />
                <Heart x={34} y={470} s={1} delay={5.3} />
                <Stroke color="brown" delay={5.2} width={2.5} d="M550 90 L550 112 M539 101 L561 101 M542 93 L558 109 M558 93 L542 109" />
                <Stroke color="brown" delay={5.4} width={2.5} d="M24 90 L24 108 M15 99 L33 99" />
                {/* big heart carved around С + Я */}
                <Stroke color="red" delay={5.0} width={3} d="M470 700 C380 650 390 600 440 606 C462 609 470 628 470 628 C470 628 478 609 500 606 C550 600 560 650 470 700 Z" />
                {/* sweat drops on the photo corner */}
                <Stroke color="blue" delay={5.6} width={2.5} d="M130 110 C124 124 124 130 130 134 C136 130 136 124 130 110 Z" />
              </svg>
            </div>
          </section>

          <div className="sf-gutter" aria-hidden />

          {/* Right page: the entries */}
          <section className="sf-page sf-page-right">
            <h1 className="sf-title sf-scribble">Записи. Очень срочные.</h1>
            <ol className="sf-entries">
              {ENTRIES.map((e, i) => (
                <li key={e.n} style={{ animationDelay: `${0.8 + i * 0.7}s` }}>
                  <b className="sf-num">№{e.n}</b> {e.body}
                </li>
              ))}
            </ol>
            <p className="sf-ps sf-scribble sf-red-text">
              P.S. Не доверяйте никому. Кроме Сафиры. Особенно Сафире.
            </p>
            <p className="sf-stain" aria-hidden />
          </section>
        </div>

        <footer className="sf-foot">
          <p className="sf-cipher">
            <span className="sf-cipher-code">{SECRET}</span>
            <span className="sf-cipher-hint">(шифр Цезаря, сдвиг 3. расшифруй, если ты не она)</span>
          </p>
          <div className="sf-prize">
            <p className="sf-prize-text sf-scribble">а теперь главное. специально для тебя:</p>
            <RunawayButton />
          </div>
        </footer>
      </article>
    </main>
  )
}
