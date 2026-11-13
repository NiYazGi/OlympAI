'use client'

import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { useT } from '@/components/i18n-provider'
import { MathLine } from '@/components/sulu/rich-message'
import { MAX_POINTS, solutionLines, type Mark, type MarkKind, type Protocol } from '@/lib/protocol'
import type { Verdict } from '@/lib/sulu/types'
import { cn } from '@/lib/utils'

export const VERDICT_LABEL: Record<Verdict, string> = {
  correct: 'Complete solution',
  partially_correct: 'Solution with a gap',
  incorrect: 'Some progress',
  not_an_attempt: 'Not a solution yet',
}

const MARK_LABEL: Record<MarkKind, string> = {
  ok: 'holds',
  gap: 'needs a reason',
  error: 'error',
  strong: 'strong idea',
}

/**
 * A graded attempt, the way a jury writes it up.
 *
 * Points first, large, because they are what a student looks for. Then the
 * student's own lines, numbered, with a bracket in the right margin over every
 * run the jury marked and a numbered circle at its top; lines the jury
 * accepted carry nothing, so quiet means accepted. The legend identifies each
 * numbered mark before the marking scheme, feedback and next step.
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
  const span = (mark: Mark) =>
    mark.from === mark.to ? t('Line {n}', { n: mark.from }) : t('Lines {from}–{to}', { from: mark.from, to: mark.to })

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="flex items-baseline gap-2">
            <span className="font-mono text-6xl leading-none font-semibold tracking-tight text-foreground tabular-nums">
              {protocol.points}
            </span>
            <span className="text-lg text-muted-foreground">{t('out of {n}', { n: MAX_POINTS })}</span>
          </p>
          <p className="pb-1 text-base font-medium">{t(VERDICT_LABEL[protocol.verdict])}</p>
        </div>
        {protocol.pointsDerived ? (
          <p className="text-xs text-muted-foreground">
            {t('recalculated from {score}/100', { score: protocol.score })}
          </p>
        ) : null}
        {protocol.summary ? <p className="max-w-[40em] text-sm leading-relaxed text-pretty">{protocol.summary}</p> : null}
      </header>

      {children}

      <ol aria-label={t('Solution')} className="border-t border-foreground/[0.06] pt-3">
        {lines.map((line, index) => {
          const number = index + 1
          const callout = calloutOn.get(number)
          const opens = callout?.mark.from === number
          const closes = callout?.mark.to === number
          return (
            <li key={number}>
              {breakLine === number && protocol.breakPoint ? (
                <BreakRow
                  title={t('Where the solution breaks')}
                  need={protocol.breakPoint.need}
                  technique={protocol.breakPoint.technique}
                  techniqueLabel={t('The idea')}
                />
              ) : null}
              <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_2.75rem] gap-x-2 py-1.5 sm:grid-cols-[2.25rem_minmax(0,1fr)_3.5rem] sm:gap-x-3">
                <span
                  className={cn(
                    'text-right font-mono text-xs leading-7 tabular-nums',
                    breakLine === number ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {number}
                </span>
                <div className="min-w-0">
                  {opens && callout ? (
                    <span className="sr-only">
                      {span(callout.mark)}: {t(MARK_LABEL[callout.mark.kind])}.{' '}
                    </span>
                  ) : null}
                  <p className="text-sm leading-7 break-words">
                    <MathLine text={line} />
                  </p>
                </div>
                <span
                  aria-hidden
                  className={cn('relative', animate && callout && 'mark-in')}
                  style={animate ? markDelay(index) : undefined}
                >
                  {callout ? (
                    <Bracket kind={callout.mark.kind} opens={opens} closes={closes} number={callout.number} />
                  ) : null}
                </span>
              </div>
            </li>
          )
        })}
      </ol>

      {protocol.reviewLocked ? (
        <p className="-mt-3 text-xs text-muted-foreground">
          {t('A line-by-line review of the reasoning — where it holds, where it breaks and why — is included in Pro.')}{' '}
          <Link href="/pricing" className="text-primary hover:underline">{t('Plans')}</Link>
        </p>
      ) : protocol.marks.length === 0 ? (
        <p className="-mt-3 text-xs text-muted-foreground">
          {t('This attempt was graded before line marks existed, so it has the feedback alone.')}
        </p>
      ) : null}

      {callouts.length ? (
        <section className="flex flex-col gap-3 border-t border-foreground/[0.06] pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
            <h3 className="text-sm font-medium">{t('Marks')}</h3>
            {/* The key is the whole set, always, so a colour never has to be
                guessed from the one entry that happens to use it. */}
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {(['strong', 'gap', 'error'] as const).map((kind) => (
                <span key={kind} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className={cn('size-2 rounded-full', LINE[kind])} />
                  {t(MARK_LABEL[kind])}
                </span>
              ))}
            </p>
          </div>
          <ol className="flex flex-col gap-2.5">
            {callouts.map(({ mark, number }) => (
              <li
                key={number}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-x-3 sm:grid-cols-[1.5rem_6rem_minmax(0,1fr)]"
              >
                <Circle kind={mark.kind} number={number} />
                <span className="hidden text-sm leading-6 text-muted-foreground tabular-nums sm:block">
                  {span(mark)}
                </span>
                <span className="text-sm leading-6 text-pretty">
                  <span className="text-muted-foreground sm:hidden">{span(mark)}. </span>
                  <strong className={cn('font-medium', INK[mark.kind])}>{capitalise(t(MARK_LABEL[mark.kind]))}.</strong>
                  {mark.note ? ` ${mark.note}` : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {protocol.criteria.length ? (
        <section className="flex flex-col gap-2 border-t border-foreground/[0.06] pt-4">
          <h3 className="text-sm font-medium">{t('Marking scheme')}</h3>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {protocol.criteria.map((criterion) => (
                <tr key={criterion.text} className="border-t border-foreground/[0.06] first:border-t-0">
                  <td className="py-2 pr-4 text-pretty">{criterion.text}</td>
                  <td
                    className={cn(
                      'py-2 text-right font-mono whitespace-nowrap tabular-nums',
                      criterion.earned === 0 && criterion.max > 0 && 'text-destructive',
                      criterion.earned > 0 && criterion.earned < criterion.max && 'text-warning',
                    )}
                  >
                    {t('{earned} of {max}', { earned: criterion.earned, max: criterion.max })}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-foreground/20">
                <th scope="row" className="py-2.5 text-left font-medium">
                  {t('Total')}
                </th>
                <td className="py-2.5 text-right font-mono font-semibold whitespace-nowrap text-foreground tabular-nums">
                  {t('{earned} of {max}', { earned: protocol.points, max: MAX_POINTS })}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      {protocol.feedback ? (
        <section className="flex flex-col gap-1.5 border-t border-foreground/[0.06] pt-4">
          <h3 className="text-sm font-medium">{t('Feedback')}</h3>
          <p className="max-w-[40em] text-sm leading-relaxed text-pretty text-foreground/90">{protocol.feedback}</p>
        </section>
      ) : null}

      {protocol.nextHint ? (
        <section className="flex flex-col gap-1.5 border-t border-foreground/[0.06] pt-4">
          <h3 className="text-sm font-medium">{t('Next step')}</h3>
          <p className="max-w-[40em] rounded-lg bg-accent p-3 text-sm leading-relaxed text-pretty text-accent-foreground">
            {protocol.nextHint}
          </p>
        </section>
      ) : null}
    </section>
  )
}

const FILL: Record<MarkKind, string> = {
  ok: 'bg-muted-foreground text-void',
  strong: 'bg-primary text-primary-foreground',
  gap: 'bg-warning text-void',
  error: 'bg-destructive text-void',
}
const LINE: Record<MarkKind, string> = {
  ok: 'bg-muted-foreground',
  strong: 'bg-primary',
  gap: 'bg-warning',
  error: 'bg-destructive',
}
const INK: Record<MarkKind, string> = {
  ok: 'text-muted-foreground',
  strong: 'text-foreground',
  gap: 'text-warning',
  error: 'text-destructive',
}

function Circle({ kind, number }: { kind: MarkKind; number: number }) {
  return (
    <span
      aria-hidden
      className={cn('flex size-6 items-center justify-center rounded-full font-mono text-xs font-semibold', FILL[kind])}
    >
      {number}
    </span>
  )
}

/**
 * One row's share of a callout: the tick and the circle on the first line of a
 * run, the upright on every line, the closing tick on the last. Rows sit edge
 * to edge, so the pieces join into one bracket.
 */
function Bracket({ kind, opens, closes, number }: { kind: MarkKind; opens: boolean; closes: boolean; number: number }) {
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
    <div className="my-2 ml-8 flex flex-col gap-1 pr-[3.25rem] sm:ml-[3rem] sm:pr-[4.25rem]">
      <span className="flex items-center gap-3">
        <span className="shrink-0 text-sm font-medium text-destructive">{title}</span>
        <span aria-hidden className="h-px flex-1 bg-destructive/70" />
      </span>
      <span className="text-sm text-pretty">
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
