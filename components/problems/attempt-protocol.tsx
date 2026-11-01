'use client'

import type { CSSProperties, ReactNode } from 'react'
import { MathText } from '@/components/math-text'
import { useT } from '@/components/i18n-provider'
import { MAX_POINTS, solutionLines, type Mark, type MarkKind, type Protocol } from '@/lib/protocol'
import { cn } from '@/lib/utils'

/**
 * A graded attempt, read the way a physics wall chart is read: numbered
 * callouts on the parts that matter, and a legend underneath that says what
 * each number is.
 *
 * The points come first, large, because they are what a student looks for.
 * Then the student's own lines, numbered, with a bracket in the right margin
 * over every run the jury marked and a numbered circle at its top. Lines the
 * jury accepted carry nothing: quiet means accepted. The colours are a closed
 * set of three and mean the same on every screen — cobalt a strong idea,
 * chrome yellow a step that needs a reason, cinnabar a mistake.
 */
export function AttemptProtocol({
  protocol,
  animate = false,
  children,
}: {
  protocol: Protocol
  /** Callouts arrive in line order, once, when this answers a submission. */
  animate?: boolean
  /** The reward, when this protocol has just been earned. */
  children?: ReactNode
}) {
  const t = useT()
  const lines = solutionLines(protocol.answer)

  // Accepted lines are not called out, so the numbers count only what matters.
  const callouts = protocol.marks
    .filter((mark) => mark.kind !== 'ok')
    .sort((a, b) => a.from - b.from)
    .map((mark, index) => ({ mark, number: index + 1 }))
  const calloutOn = new Map<number, { mark: Mark; number: number }>()
  for (const callout of callouts) {
    for (let line = callout.mark.from; line <= callout.mark.to; line++) calloutOn.set(line, callout)
  }
  const breakLine = protocol.breakPoint?.line ?? null

  return (
    <section className="flex flex-col gap-7">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-x-7 gap-y-3">
          <p className="flex items-baseline gap-2">
            <span className="font-figure text-[4.5rem] leading-[3.75rem] font-extrabold tracking-[-0.02em]">
              {protocol.points}
            </span>
            <span className="font-display text-[1.375rem] font-semibold text-muted-foreground">
              {t.protocol.outOf}
            </span>
          </p>
          <p className="pb-0.5 font-display text-block font-bold">
            {t.solve.verdict[protocol.verdict]}
          </p>
        </div>
        {protocol.pointsDerived ? (
          <p className="text-caption text-muted-foreground">{t.protocol.derived(protocol.score)}</p>
        ) : null}
        {protocol.summary ? (
          <p className="max-w-[36em] text-reading text-pretty">{protocol.summary}</p>
        ) : null}
      </header>

      {children}

      <ol aria-label={t.protocol.solution} className="border-t border-border pt-3">
        {lines.map((line, index) => {
          const number = index + 1
          const callout = calloutOn.get(number)
          const opens = callout?.mark.from === number
          const closes = callout?.mark.to === number
          return (
            <li key={number}>
              {breakLine === number && protocol.breakPoint ? (
                <BreakRow
                  title={t.protocol.breaks}
                  need={protocol.breakPoint.need}
                  technique={protocol.breakPoint.technique}
                  techniqueLabel={t.protocol.technique}
                />
              ) : null}
              <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_2.75rem] gap-x-2 py-1.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_3.5rem] sm:gap-x-3">
                <span
                  className={cn(
                    'text-right text-caption leading-7 font-semibold tabular-nums',
                    breakLine === number ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {number}
                </span>
                <div className="min-w-0">
                  {opens && callout ? (
                    <span className="sr-only">
                      {callout.mark.from === callout.mark.to
                        ? t.protocol.line(callout.mark.from)
                        : t.protocol.lines(callout.mark.from, callout.mark.to)}
                      : {t.protocol.mark[callout.mark.kind]}.{' '}
                    </span>
                  ) : null}
                  <p className="text-reading break-words">
                    <MathText>{line}</MathText>
                  </p>
                </div>
                <span
                  aria-hidden
                  className={cn('relative', animate && callout && 'mark-in')}
                  style={animate ? markDelay(index) : undefined}
                >
                  {callout ? (
                    <Bracket
                      kind={callout.mark.kind}
                      opens={opens}
                      closes={closes}
                      number={callout.number}
                    />
                  ) : null}
                </span>
              </div>
            </li>
          )
        })}
      </ol>

      {protocol.marks.length === 0 ? (
        <p className="-mt-4 text-caption text-muted-foreground">{t.protocol.noMarks}</p>
      ) : null}

      {callouts.length ? (
        <section className="flex flex-col gap-3.5 border-t border-border pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
            <h3 className="font-display text-lg font-semibold">{t.protocol.legend}</h3>
            {/* The key is the whole set, always, so a colour never has to be
                guessed from the one entry that happens to use it. */}
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-caption font-semibold text-muted-foreground">
              {(['strong', 'gap', 'error'] as const).map((kind) => (
                <span key={kind} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className={cn('size-2.5 rounded-full', DOT[kind])} />
                  {t.protocol.mark[kind]}
                </span>
              ))}
            </p>
          </div>
          <ol className="flex flex-col gap-3">
            {callouts.map(({ mark, number }) => (
              <li
                key={number}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-x-3 sm:grid-cols-[1.5rem_6rem_minmax(0,1fr)] sm:gap-x-3.5"
              >
                <Circle kind={mark.kind} number={number} />
                <span className="hidden text-ui leading-6 font-semibold text-muted-foreground tabular-nums sm:block">
                  {mark.from === mark.to
                    ? t.protocol.line(mark.from)
                    : t.protocol.lines(mark.from, mark.to)}
                </span>
                <span className="text-ui leading-6 text-pretty">
                  <span className="font-semibold text-muted-foreground sm:hidden">
                    {mark.from === mark.to
                      ? t.protocol.line(mark.from)
                      : t.protocol.lines(mark.from, mark.to)}
                    .{' '}
                  </span>
                  <strong className={cn('font-bold', INK[mark.kind])}>
                    {capitalise(t.protocol.mark[mark.kind])}.
                  </strong>
                  {mark.note ? ` ${mark.note}` : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {protocol.criteria.length ? (
        <section className="flex flex-col gap-2.5 border-t border-border pt-4">
          <h3 className="font-display text-lg font-semibold">{t.protocol.criteria}</h3>
          <table className="w-full border-collapse text-ui">
            <tbody>
              {protocol.criteria.map((criterion) => (
                <tr key={criterion.text} className="border-t border-border/70 first:border-t-0">
                  <td className="py-2 pr-4 text-pretty">{criterion.text}</td>
                  <td
                    className={cn(
                      'py-2 text-right font-semibold whitespace-nowrap tabular-nums',
                      criterion.earned === 0 && criterion.max > 0 && 'font-bold text-destructive',
                      criterion.earned > 0 && criterion.earned < criterion.max && 'text-warning',
                    )}
                  >
                    {t.protocol.earnedOf(criterion.earned, criterion.max)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-foreground">
                <th scope="row" className="py-2.5 text-left font-bold">
                  {t.protocol.total}
                </th>
                <td className="py-2.5 text-right font-extrabold whitespace-nowrap tabular-nums">
                  {t.protocol.earnedOf(protocol.points, MAX_POINTS)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      {protocol.feedback ? (
        <section className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="font-display text-lg font-semibold">{t.protocol.feedback}</h3>
          <p className="max-w-[36em] text-ui text-pretty">{protocol.feedback}</p>
        </section>
      ) : null}

      {protocol.nextHint ? (
        <section className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="font-display text-lg font-semibold">{t.protocol.nextStep}</h3>
          <p className="max-w-[36em] text-reading text-pretty">{protocol.nextHint}</p>
        </section>
      ) : null}
    </section>
  )
}

const FILL: Record<MarkKind, string> = {
  ok: 'bg-muted-foreground text-background',
  strong: 'bg-primary text-primary-foreground',
  gap: 'bg-chrome text-ink',
  error: 'bg-destructive text-white',
}
const LINE: Record<MarkKind, string> = {
  ok: 'bg-muted-foreground',
  strong: 'bg-primary',
  gap: 'bg-chrome',
  error: 'bg-destructive',
}
const DOT = LINE
const INK: Record<MarkKind, string> = {
  ok: 'text-muted-foreground',
  strong: 'text-primary',
  gap: 'text-warning',
  error: 'text-destructive',
}

function Circle({ kind, number }: { kind: MarkKind; number: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-6 items-center justify-center rounded-full font-figure text-sm leading-none font-extrabold',
        FILL[kind],
      )}
    >
      {number}
    </span>
  )
}

/**
 * One row's share of a callout: the tick and the circle on the first line of
 * a run, the upright on every line, the closing tick on the last. Rows sit
 * edge to edge, so the pieces join into one bracket.
 */
function Bracket({
  kind,
  opens,
  closes,
  number,
}: {
  kind: MarkKind
  opens: boolean
  closes: boolean
  number: number
}) {
  const tick = 'absolute left-0 h-0.5 w-2 sm:w-3'
  return (
    <>
      <span
        className={cn(
          'absolute left-1.5 w-0.5 sm:left-2.5',
          LINE[kind],
          opens ? 'top-[0.8125rem]' : '-top-1.5',
          closes ? 'bottom-[0.8125rem]' : '-bottom-1.5',
        )}
      />
      {opens ? <span className={cn(tick, 'top-[0.8125rem]', LINE[kind])} /> : null}
      {closes ? <span className={cn(tick, 'bottom-[0.8125rem]', LINE[kind])} /> : null}
      {opens ? (
        <span className="absolute top-0.5 left-4 sm:left-[1.375rem]">
          <Circle kind={kind} number={number} />
        </span>
      ) : null}
    </>
  )
}

/** The rule drawn across the solution above the first line that fails. */
function BreakRow({
  title,
  need,
  technique,
  techniqueLabel,
}: {
  title: string
  need: string
  technique: string | null
  techniqueLabel: string
}) {
  return (
    <div className="my-2 ml-8 flex flex-col gap-1 pr-[3.25rem] sm:ml-[3.25rem] sm:pr-[4.25rem]">
      <span className="flex items-center gap-3">
        <span className="shrink-0 font-display text-ui font-bold text-destructive">{title}</span>
        <span aria-hidden className="h-0.5 flex-1 bg-destructive" />
      </span>
      <span className="text-ui text-pretty">
        {need}
        {technique ? ` ${techniqueLabel}: ${technique}.` : null}
      </span>
    </div>
  )
}

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Callouts arrive in line order and the last one lands within 400ms however
 * long the solution is: the step shrinks rather than the wait growing.
 */
function markDelay(index: number): CSSProperties {
  return { '--mark-delay': `${Math.min(index * 30, 300)}ms` } as CSSProperties
}
