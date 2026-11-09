'use client'

import { useActionState, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import Link from 'next/link'
import { ArrowDownRight, ArrowLeft, ArrowRight, BookOpen, Check, Clock, ListChecks, NotebookPen, RotateCcw, Timer, Trophy } from 'lucide-react'
import { startPreparationMock } from '@/app/(app)/plan/actions'
import { useLocale, useT } from '@/components/i18n-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatDay } from '@/lib/i18n/config'
import type { PreparationPlan, PreparationStep } from '@/lib/preparation'
import { cardClass, cn } from '@/lib/utils'
import styles from './roadmap.module.css'

const ICONS = { lesson: BookOpen, quiz: ListChecks, task: NotebookPen, mock: Timer, review: RotateCcw }
const LABELS = { lesson: 'Theory', quiz: 'Quiz', task: 'Problem', mock: 'Mock test', review: 'Review mistakes' }

const STOP_SPACING = 164
const MAP_HEIGHT = 284
const FIRST_STOP = 92
const STOP_HEIGHTS = [104, 52, 77, 146, 194, 161, 90, 55, 120, 176, 151]
const TRIANGLE_PATH = 'M 35.5 6.8 Q 39 0.7 42.5 6.8 L 73.5 60.4 Q 77 66.5 70 66.5 H 8 Q 1 66.5 4.5 60.4 Z'
const triangleStyle = { '--triangle-clip': `path('${TRIANGLE_PATH}')` } as CSSProperties

function findStop(viewport: HTMLElement, id: string) {
  return [...viewport.querySelectorAll<HTMLButtonElement>('[data-route-step]')]
    .find((node) => node.dataset.routeStep === id)
}

function moveCamera(viewport: HTMLElement, node: HTMLElement, animate = true) {
  const bounds = node.getBoundingClientRect()
  const offset = bounds.left + bounds.width / 2 - viewport.getBoundingClientRect().left
  const smooth = animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  viewport.scrollBy({ left: offset - viewport.clientWidth / 2, behavior: smooth ? 'smooth' : 'instant' })
}

export function PreparationRoadmap({ plan, name, subject, targetDate, competitionSlug, mockPrefix, variant = 'dashboard' }: {
  plan: PreparationPlan
  name: string
  subject: string
  targetDate: string
  competitionSlug: string | null
  mockPrefix: string
  variant?: 'dashboard' | 'schedule'
}) {
  const t = useT()
  const locale = useLocale()
  const inSchedule = variant === 'schedule'
  const track = useRef<HTMLDivElement>(null)
  const detail = useRef<HTMLDivElement>(null)
  const detailId = useId()
  const drag = useRef<{ id: number; start: number; scroll: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [selection, setSelection] = useState<string | null>(null)
  const current = plan.steps.find((step) => !step.completedAt)
  const currentId = current?.id ?? 'goal'
  const selected = selection === 'goal' ? null : plan.steps.find((step) => step.id === selection) ?? current
  const selectedId = selected?.id ?? 'goal'
  const completed = plan.steps.filter((step) => step.completedAt).length
  const targetLabel = formatDay(targetDate, locale)

  const points = Array.from({ length: plan.steps.length + 1 }, (_, index) => ({
    x: FIRST_STOP + index * STOP_SPACING,
    y: STOP_HEIGHTS[index % STOP_HEIGHTS.length],
  }))
  const finish = points[points.length - 1]
  const width = finish.x + 104
  const currentIndex = current ? plan.steps.findIndex((step) => step.id === current.id) : plan.steps.length

  useEffect(() => {
    const viewport = track.current
    const node = viewport && findStop(viewport, currentId)
    if (viewport && node) moveCamera(viewport, node, false)
  }, [currentId, mockPrefix])

  function jump(id: string) {
    setSelection(id)
    const viewport = track.current
    const node = viewport && findStop(viewport, id)
    if (viewport && node) moveCamera(viewport, node)
  }

  function openStop(id: string) {
    jump(id)
    requestAnimationFrame(() => detail.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
  }

  function scroll(direction: number) {
    const viewport = track.current
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (viewport) viewport.scrollBy({ left: direction * Math.max(STOP_SPACING, viewport.clientWidth - STOP_SPACING), behavior: smooth ? 'smooth' : 'instant' })
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    drag.current = { id: event.pointerId, start: event.clientX, scroll: event.currentTarget.scrollLeft, moved: false }
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current
    if (!gesture || gesture.id !== event.pointerId) return
    const distance = event.clientX - gesture.start
    if (!gesture.moved && Math.abs(distance) < 6) return

    const viewport = event.currentTarget
    if (!gesture.moved) {
      gesture.moved = true
      suppressClick.current = true
      viewport.setPointerCapture(event.pointerId)
      viewport.dataset.dragging = ''
    }
    viewport.scrollLeft = gesture.scroll - distance
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return
    drag.current = null
    delete event.currentTarget.dataset.dragging
  }

  function navigateStops(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const nodes = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-route-step]')]
    const focused = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-route-step]')
    const index = nodes.findIndex((node) => node.dataset.routeStep === (focused?.dataset.routeStep ?? selectedId))
    let next = index
    if (event.key === 'ArrowRight') next++
    else if (event.key === 'ArrowLeft') next--
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = nodes.length - 1
    else return

    event.preventDefault()
    const node = nodes[Math.max(0, Math.min(nodes.length - 1, next))]
    if (!node?.dataset.routeStep) return
    node.focus({ preventScroll: true })
    jump(node.dataset.routeStep)
  }

  return (
    <section aria-labelledby="preparation-heading" className={cn('min-w-0', inSchedule && [cardClass, 'overflow-hidden'])}>
      <div className={cn('flex flex-wrap items-baseline gap-x-4 gap-y-1', inSchedule && 'px-4 pt-3 sm:px-5')}>
        <h2 id="preparation-heading" className="font-display text-lg font-semibold tracking-tight sm:text-xl">{name}</h2>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {targetLabel}
          {plan.daysLeft > 0 ? <span>· {t('{n} {n|day|days} left', { n: plan.daysLeft })}</span> : null}
          <span>· {t(subject)}</span>
        </p>
      </div>

      <div className={cn('mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5', inSchedule && 'px-4 sm:px-5')}>
        <p className="text-xs text-muted-foreground">
          {t('{completed} of {total} steps completed', { completed, total: plan.steps.length })}
          {inSchedule && plan.preferredMinutes > 0 ? <> · {t('{planned} of {available} min planned', { planned: plan.scheduledMinutes, available: plan.preferredMinutes })}</> : null}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {!inSchedule ? (
            <Link href="/plan" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              {t('Schedule')}
            </Link>
          ) : null}
          {current ? <Button size="sm" variant="ghost" onClick={() => jump(currentId)}>{t('Current step')}</Button> : null}
          <Button size="sm" variant="ghost" onClick={() => jump('goal')}>{t('Goal')}</Button>
          <Button size="icon-sm" variant="ghost" aria-label={t('Scroll to earlier steps')} onClick={() => scroll(-1)}><ArrowLeft /></Button>
          <Button size="icon-sm" variant="ghost" aria-label={t('Scroll to later steps')} onClick={() => scroll(1)}><ArrowRight /></Button>
        </div>
      </div>

      <div className={cn('relative mt-1', inSchedule && [styles.map, 'border-y border-border'])}>
        <div ref={track} role="region" aria-label={t('Preparation route')} tabIndex={0}
          className={cn(styles.viewport, 'overflow-x-auto outline-offset-[-2px]')}
          onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag}
          onPointerCancel={endDrag} onLostPointerCapture={endDrag} onPointerLeave={(event) => {
            if (!drag.current?.moved) endDrag(event)
          }}
          onClickCapture={(event) => {
            if (suppressClick.current && event.detail > 0) {
              event.preventDefault()
              event.stopPropagation()
            }
          }}
          onKeyDown={navigateStops}>
          <div className="relative min-w-full" style={{ width, height: MAP_HEIGHT }}>
            <svg aria-hidden className="pointer-events-none absolute inset-0 size-full"
              viewBox={`0 0 ${width} ${MAP_HEIGHT}`} preserveAspectRatio="none">
              {points.slice(1).map((point, index) => {
                const previous = points[index]
                const middle = (previous.x + point.x) / 2
                return (
                  <path key={point.x} className={index < currentIndex ? styles.visitedTrail : styles.trail}
                    vectorEffect="non-scaling-stroke"
                    d={`M ${previous.x} ${previous.y} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`} />
                )
              })}
            </svg>
            <ol className="relative size-full">
              {plan.steps.map((step, index) => {
                const Icon = ICONS[step.kind]
                const label = t(LABELS[step.kind])
                const title = t(step.topic ?? step.title)
                const active = step.id === currentId
                const point = points[index]
                return (
                  <li key={step.id}>
                    <button type="button" data-route-step={step.id} data-kind={step.kind}
                      data-state={active ? 'current' : step.completedAt ? 'done' : 'upcoming'}
                      aria-pressed={step.id === selectedId} aria-current={active ? 'step' : undefined}
                      aria-controls={detailId} onClick={() => openStop(step.id)}
                      className={styles.stop} style={{ left: `${point.x / width * 100}%`, top: point.y }}>
                      <span className={styles.platform} style={step.kind === 'task' ? triangleStyle : undefined}>
                        {step.kind === 'task' ? (
                          <svg aria-hidden className={styles.triangleOutline} viewBox="0 0 78 68">
                            <path d={TRIANGLE_PATH} />
                          </svg>
                        ) : null}
                        <Icon className="size-6" />
                        {step.completedAt ? (
                          <>
                            <span className={styles.completeMark} aria-hidden><Check className="size-3" strokeWidth={3} /></span>
                            <span className="sr-only">{t('Done')}</span>
                          </>
                        ) : null}
                      </span>
                      <span className={styles.label}>{label}</span>
                      <span className="sr-only">
                        {title !== label ? title + ' · ' : ''}{formatDay(step.date, locale)}
                      </span>
                    </button>
                  </li>
                )
              })}
              <li>
                <button type="button" data-route-step="goal" data-state="finish" aria-controls={detailId}
                  aria-pressed={selectedId === 'goal'} onClick={() => openStop('goal')}
                  className={styles.stop} style={{ left: `${finish.x / width * 100}%`, top: finish.y }}>
                  <span className={styles.platform}><Trophy className="size-6" /></span>
                  <span className={styles.label}>{t('Finish')}</span>
                  <span className="sr-only">{name} · {targetLabel}</span>
                </button>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <div ref={detail} id={detailId} className={cn('py-4', inSchedule ? 'bg-muted/35 px-4 sm:px-6' : 'border-t border-border')}>
        {selected ? <StepDetail key={selected.id} step={selected} current={selected.id === currentId} mockPrefix={mockPrefix} />
          : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">{t('Goal')}</p>
                <p className="mt-1 text-sm font-semibold">{name} · {targetLabel}</p>
              </div>
              {competitionSlug ? <Link href={`/olympiads/${competitionSlug}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>{t('Competition details')} <ArrowDownRight /></Link> : null}
            </div>
          )}
        {plan.adaptedToday ? <p className="mt-3 text-xs text-muted-foreground">{t('Today’s session is lighter based on your check-in. The remaining work was rescheduled.')}</p> : null}
        {plan.daysLeft > 0 && plan.daysLeft <= 2 ? <p className="mt-2 text-xs text-muted-foreground">{t('Final two days for light review and rest.')}</p> : null}
        {plan.priorityOnly && plan.daysLeft > 2 ? <p className="mt-2 text-xs text-muted-foreground">{t('This schedule focuses on what fits before the target date.')}</p> : null}
        {!plan.hasArchive && plan.steps.some((step) => step.source === 'similar') ? (
          <p className="mt-2 text-xs text-muted-foreground">{t('The route uses comparable practice where the archive has no matching tasks.')}</p>
        ) : null}
        {!plan.steps.some((step) => !step.completedAt) ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {plan.daysLeft === 0 ? t('The target date has arrived. Set a new date to continue preparing.') :
              !plan.hasMaterials ? t('The library has no practice tasks for this subject and class.') :
                plan.daysLeft > 2 ? t('Check your schedule to fit more preparation before the target date.') : null}
            {' '}<Link href={plan.daysLeft === 0 ? '/learn' : '/plan'} className="underline">{plan.daysLeft === 0 ? t('Change target') : t('Schedule')}</Link>
          </p>
        ) : null}
      </div>
    </section>
  )
}

function StepDetail({ step, current, mockPrefix }: { step: PreparationStep; current: boolean; mockPrefix: string }) {
  const t = useT()
  const locale = useLocale()
  const [result, start, pending] = useActionState(startPreparationMock, null)
  const title = t(step.title)
  const topic = step.topic && t(step.topic)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1 basis-48">
        <p className="eyebrow">{step.completedAt ? t('Done') : current ? t('Current step') : t('Upcoming step')} · {t(LABELS[step.kind])}</p>
        <p className="mt-1 text-sm font-semibold">{title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
          <Clock className="size-3" /> {t('{n} min', { n: step.minutes })}
          <span>· {formatDay(step.date, locale)}{step.endDate ? ` – ${formatDay(step.endDate, locale)}` : ''}</span>
          {topic && topic !== title ? <span>· {topic}</span> : null}
          {step.source ? <span>· {t(step.source === 'archive' ? 'Competition archive' : 'Comparable practice')}</span> : null}
          {step.mock ? <span>· {t(step.mock.fullPaper ? 'Past paper' : 'Short rehearsal')} · {t('{n} problems', { n: step.mock.taskIds.length })}</span> : null}
        </p>
        {result?.error ? <p role="alert" className="mt-2 text-xs text-destructive">{result.error}</p> : null}
      </div>
      {step.href ? (
        <Link href={step.href} prefetch={false} className={buttonVariants()}>
          {t(step.kind === 'mock' && !step.completedAt ? 'Continue' : step.kind === 'review' ? 'Review mistakes' : 'Open activity')} <ArrowRight />
        </Link>
      ) : step.mock ? (
        <form action={start}>
          <input type="hidden" name="step" value={step.id} />
          <input type="hidden" name="scope" value={mockPrefix} />
          <Button type="submit" disabled={pending}>{t(pending ? 'Starting…' : 'Start mock test')} <ArrowRight /></Button>
        </form>
      ) : null}
    </div>
  )
}
