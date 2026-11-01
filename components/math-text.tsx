import katex from 'katex'
import 'katex/dist/katex.min.css'

import { splitFigures } from '@/lib/statement-figures'

/**
 * Text with mathematics in it, which is most of what this product shows.
 *
 * Olympiad statements arrive with LaTeX inline — `\(x^2 - 2\)` — and until now
 * the app rendered a problem as a plain string, so a maths problem read as a
 * row of backslashes and braces. This splits the text on the delimiters and
 * hands each fragment to KaTeX, leaving everything between them as ordinary
 * prose.
 *
 * Rendered on the server. KaTeX produces static HTML and needs no script in
 * the browser, so a statement is complete in the first flush and costs the
 * page nothing — which is the opposite of MathJax, whose whole job happens
 * after the page arrives.
 *
 * `throwOnError: false` on purpose: a malformed formula in one imported
 * problem should print itself in red and leave the other four hundred alone,
 * not take down the page they are all on.
 */
/** Built per call: a global regex carries `lastIndex`, and one shared between
 *  renders is a variable two components take turns corrupting. */
const pattern = () => /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g

export function MathText({ children, className }: { children: string; className?: string }) {
  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let key = 0

  const re = pattern()
  while ((match = re.exec(children)) !== null) {
    if (match.index > last) parts.push(children.slice(last, match.index))
    const display = match[1] !== undefined || match[3] !== undefined
    const source = match[1] ?? match[2] ?? match[3] ?? match[4] ?? ''
    parts.push(
      <span
        key={`m${key++}`}
        // The input is a problem statement from the database, not from a
        // reader, and KaTeX escapes what it emits.
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(source, {
            displayMode: display,
            throwOnError: false,
            strict: false,
            output: 'html',
          }),
        }}
      />,
    )
    last = match.index + match[0].length
  }
  if (last < children.length) parts.push(children.slice(last))

  return <span className={className}>{parts.length ? parts : children}</span>
}

/** A figure cut from the source page. Paper is white, so the frame is too. */
function StatementFigure({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="my-1 overflow-hidden rounded-lg bg-white p-2 ring-1 ring-foreground/10">
      {/* Sizes vary from a one-row table to a full-page diagram, and the files
          are already cut to their content: the browser lays them out at their
          own size, capped at the column. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="mx-auto h-auto max-h-[28rem] max-w-full" />
    </figure>
  )
}

/**
 * Paragraphs, each of which may contain mathematics and figures.
 *
 * Some sources collapse a paper into one long paragraph, so a figure can
 * arrive mid-paragraph; it is lifted out onto its own line rather than
 * squeezed in between two words.
 */
export function MathParagraphs({
  text,
  className,
  figureAlt = '',
}: {
  text: string
  className?: string
  /** What every figure is, for a reader who cannot see it. */
  figureAlt?: string
}) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .flatMap((paragraph, index) =>
          splitFigures(paragraph).map((part, n) =>
            part.kind === 'figure' ? (
              <StatementFigure key={`${index}-${n}`} src={part.src} alt={part.alt || figureAlt} />
            ) : (
              <p key={`${index}-${n}`} className={className}>
                <MathText>{part.text}</MathText>
              </p>
            ),
          ),
        )}
    </>
  )
}
