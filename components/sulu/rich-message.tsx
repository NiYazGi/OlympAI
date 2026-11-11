'use client'

import { Fragment, useEffect, useState, type ReactNode } from 'react'
import 'katex/dist/katex.min.css'
import { useT } from '@/components/i18n-provider'

/**
 * A Sulu message as the student should read it.
 *
 * Replies came through as raw text, so a phone showed backslashes, \frac and
 * **asterisks** instead of fractions and emphasis. This renders the small
 * subset the coach is told to use — paragraphs, bullet and numbered lists,
 * **bold**, `code`, and LaTeX in \( \), \[ \], $ $ or $$ $$ — and nothing else.
 *
 * KaTeX is loaded on first use rather than shipped with every page; until it
 * arrives, or if a formula does not parse, the source is shown as it was
 * written, which is still readable. Text goes through React, so it is escaped;
 * only KaTeX's own output is set as HTML, with `trust` off.
 */

type Katex = typeof import('katex')
let katexPromise: Promise<Katex> | null = null
function loadKatex() {
  katexPromise ??= import('katex').then((module) => (module.default ?? module) as Katex)
  return katexPromise
}

const MATH = /\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g
const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`/g

function Formula({ tex, display, katex }: { tex: string; display: boolean; katex: Katex | null }) {
  let html: string | null = null
  if (katex) {
    try {
      html = katex.renderToString(tex, { displayMode: display, throwOnError: true, trust: false, strict: 'ignore', output: 'htmlAndMathml' })
    } catch {
      // Shown as source text below.
    }
  }
  if (html !== null) {
    return (
      <span
        className={display ? 'my-2 block max-w-full overflow-x-auto overflow-y-hidden' : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }
  return <code className="break-words font-mono text-[0.92em] text-foreground/80">{display ? `\\[${tex}\\]` : tex}</code>
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) out.push(text.slice(last, match.index))
    out.push(
      match[1] !== undefined ? (
        <strong key={`${keyPrefix}-${match.index}`} className="font-semibold text-foreground">
          {match[1]}
        </strong>
      ) : (
        <code key={`${keyPrefix}-${match.index}`} className="rounded bg-foreground/[0.06] px-1 font-mono text-[0.92em]">
          {match[2]}
        </code>
      ),
    )
    last = match.index + match[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function Line({ text, katex }: { text: string; katex: Katex | null }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(MATH)) {
    if (match.index > last) parts.push(...inline(text.slice(last, match.index), `t${last}`))
    const display = match[1] !== undefined || match[2] !== undefined
    const tex = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? '').trim()
    parts.push(<Formula key={`m${match.index}`} tex={tex} display={display} katex={katex} />)
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(...inline(text.slice(last), `t${last}`))
  return <>{parts}</>
}

const BULLET = /^\s*[-*•]\s+/
const NUMBERED = /^\s*\d+[.)]\s+/

function Blocks({ text, katex }: { text: string; katex: Katex | null }) {
  // Display maths may span lines; keep each \[ … \] or $$ … $$ on one logical line.
  const joined = text.replace(/\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$/g, (m) => m.replace(/\n/g, ' '))
  const paragraphs = joined.split(/\n\s*\n/)
  return (
    <div className="space-y-2.5">
      {paragraphs.map((paragraph, i) => {
        const lines = paragraph.split('\n').filter((line) => line.trim())
        if (lines.length && lines.every((line) => BULLET.test(line) || NUMBERED.test(line))) {
          const numbered = NUMBERED.test(lines[0])
          const List = numbered ? 'ol' : 'ul'
          return (
            <List key={i} className={numbered ? 'list-decimal space-y-1 pl-5' : 'list-disc space-y-1 pl-5'}>
              {lines.map((line, j) => (
                <li key={j}>
                  <Line text={line.replace(numbered ? NUMBERED : BULLET, '')} katex={katex} />
                </li>
              ))}
            </List>
          )
        }
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 ? <br /> : null}
                {/* Headings are not part of the coach's register; show them as bold lines. */}
                {/^#{1,6}\s/.test(line) ? (
                  <strong className="font-semibold text-foreground">
                    <Line text={line.replace(/^#{1,6}\s+/, '')} katex={katex} />
                  </strong>
                ) : (
                  <Line text={line} katex={katex} />
                )}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

const DRAFT = /\n*<student_draft>\n?([\s\S]*?)\n?<\/student_draft>\s*$/

export function RichMessage({ content, role }: { content: string; role: 'user' | 'assistant' }) {
  const t = useT()
  const katex = useKatex(content)

  if (role === 'user') {
    const draft = content.match(DRAFT)
    const message = draft ? content.slice(0, draft.index) : content
    return (
      <div className="whitespace-pre-wrap break-words">
        {message}
        {draft ? (
          <details className="mt-2 rounded-lg bg-black/10 px-2 py-1 text-xs">
            <summary className="cursor-pointer select-none">{t('Your draft was attached')}</summary>
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono">{draft[1]}</pre>
          </details>
        ) : null}
      </div>
    )
  }

  return (
    <div className="break-words">
      <Blocks text={content} katex={katex} />
    </div>
  )
}

/** KaTeX, loaded once for whatever client text needs it. */
export function useKatex(text: string) {
  const [katex, setKatex] = useState<Katex | null>(null)
  const hasMath = /\\\(|\\\[|\$/.test(text)
  useEffect(() => {
    if (!hasMath || katex) return
    let live = true
    loadKatex().then(
      (module) => {
        if (live) setKatex(module)
      },
      () => {},
    )
    return () => {
      live = false
    }
  }, [hasMath, katex])
  return katex
}

/**
 * One line of a student's solution, with its formulas typeset: the marked
 * lines of a protocol, the transcription of a notebook photo.
 */
export function MathLine({ text }: { text: string }) {
  const katex = useKatex(text)
  return <Line text={text} katex={katex} />
}
