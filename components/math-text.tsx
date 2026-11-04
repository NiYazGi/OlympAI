import katex from 'katex'
import 'katex/dist/katex.min.css'
import { Fragment } from 'react'
import { cn } from '@/lib/utils'

/**
 * A problem statement: plain text with LaTeX in \( \) (inline) and \[ \]
 * (display), the way the olympiad archive writes it.
 *
 * Rendered with KaTeX to HTML on the server, so the page arrives with the
 * formulas already typeset and no maths library is shipped to the browser —
 * only its stylesheet and fonts, which the browser loads on the pages that
 * use this. Text outside the delimiters goes through React as text, so it is
 * escaped; only KaTeX's own output is set as HTML, with `trust` off, so a
 * statement cannot smuggle a link or script in through \href or \html.
 *
 * Blank lines separate paragraphs; a single newline is a line break, which is
 * how the import keeps numbered conditions on lines of their own.
 */

const MATH = /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g

/**
 * Plain-TeX commands the archive uses and KaTeX does not know. Without these
 * ten statements rendered as red error text.
 */
const MACROS = { '\\displaylines': '\\begin{gathered}#1\\end{gathered}' }
/** `\root 3 \of {x}` is plain TeX for \sqrt[3]{x}; KaTeX macros cannot match the `\of` delimiter. */
const ROOT = /\\root\s*(\{[^{}]*\}|[^\s\\{]+)\s*\\of\s*/g

function render(tex: string, displayMode: boolean) {
  const source = tex.replace(ROOT, (_, index: string) => `\\sqrt[${index.replace(/^\{|\}$/g, '')}]`)
  return katex.renderToString(source, {
    displayMode,
    throwOnError: false,
    trust: false,
    strict: 'ignore',
    output: 'html',
    macros: { ...MACROS },
  })
}

function Line({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(MATH)) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const display = match[2] !== undefined
    parts.push(
      <span
        key={match.index}
        className={display ? 'my-3 block overflow-x-auto overflow-y-hidden' : undefined}
        dangerouslySetInnerHTML={{ __html: render((display ? match[2] : match[1])!.trim(), display) }}
      />,
    )
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

/**
 * A line that is only `![alt](/tasks/…)` is a figure. Only images the app
 * itself serves from public/tasks are allowed, so imported text cannot point
 * the page at another host.
 */
const FIGURE = /^!\[([^\]]*)\]\((\/tasks\/[A-Za-z0-9/_.-]+\.(?:png|jpe?g|webp|svg))\)$/

export function MathText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n\s*\n/)
  return (
    <div className={cn('space-y-3 leading-relaxed [&_.katex]:text-[1.05em]', className)}>
      {paragraphs.map((paragraph, i) => {
        const lines = paragraph.split('\n').map((line) => line.trim())
        if (lines.every((line) => FIGURE.test(line))) {
          return (
            <figure key={i} className="flex flex-wrap justify-center gap-3 py-1">
              {lines.map((line, j) => {
                const [, alt, src] = line.match(FIGURE)!
                return (
                  // Plain <img>: figures come in every size and the statement
                  // is server-rendered text, not a layout next/image can size.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={j}
                    src={src}
                    alt={alt}
                    loading="lazy"
                    className="max-h-[420px] max-w-full rounded-lg bg-white p-2"
                  />
                )
              })}
            </figure>
          )
        }
        return (
          <p key={i}>
            {paragraph.split('\n').map((line, j) => (
              <Fragment key={j}>
                {j > 0 ? <br /> : null}
                <Line text={line} />
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}
