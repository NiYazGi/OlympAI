/**
 * Figures inside a problem statement.
 *
 * Imported problems carry their circuits, graphs and tables as `![](/figures/…)`
 * lines, set where the source page printed them. The statement is the one
 * place a figure belongs, so it is written into the text rather than kept in a
 * column beside it: a paper prints a table between two sentences, and a column
 * cannot say which two.
 *
 * Only paths under this site are figures. A link to anywhere else is left as
 * text, so nothing in a statement makes a reader's browser fetch from a host
 * the product did not choose.
 */
const FIGURE = /!\[([^\]]*)\]\((\/figures\/[^)\s]+)\)/g

export type StatementPart = { kind: 'text'; text: string } | { kind: 'figure'; src: string; alt: string }

/** One paragraph, cut into its text and the figures standing in it. */
export function splitFigures(paragraph: string): StatementPart[] {
  const parts: StatementPart[] = []
  let last = 0
  for (const match of paragraph.matchAll(FIGURE)) {
    const before = paragraph.slice(last, match.index).trim()
    if (before) parts.push({ kind: 'text', text: before })
    parts.push({ kind: 'figure', src: match[2], alt: match[1] })
    last = match.index + match[0].length
  }
  const rest = paragraph.slice(last).trim()
  if (rest) parts.push({ kind: 'text', text: rest })
  return parts
}

/** The figures a statement shows, in order. */
export function figuresIn(text: string) {
  return [...text.matchAll(FIGURE)].map((match) => match[2])
}

/**
 * The statement as text for a model, each figure replaced by a numbered
 * reference to the image sent alongside it — so "the circuit shown" and
 * "[Figure 2]" can be put together by whoever reads it.
 */
export function numberFigures(text: string) {
  let n = 0
  return text.replace(FIGURE, () => `[Figure ${(n += 1)}]`)
}
