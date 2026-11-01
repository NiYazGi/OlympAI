'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Layers, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { createCard, deleteCard, reviewCard } from '@/app/(app)/learn/actions'
import { Meter } from '@/components/meter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Textarea } from '@/components/ui/textarea'
import { intervalAfter, RATINGS, type Rating } from '@/lib/srs'
import type { StudyCard, TopicCards } from '@/lib/types'
import { useT } from '@/components/i18n-provider'
import { cardClass, cn } from '@/lib/utils'

/**
 * The recall step.
 *
 * Cards arrive already ordered by lib/srs.ts — overdue first, new after — so
 * the queue here is just that list walked in order. The four ratings say when
 * the card comes back, and each button states the interval it buys rather than
 * leaving the student to guess what "Hard" costs them.
 *
 * A rating moves the deck on at once and saves in the background. Waiting for
 * the round trip put half a second between the judgement and the next card,
 * which is most of the time a review takes; and a rating that fails to save
 * fails safe, because a card that was not rescheduled is simply still due.
 */
export function CardDeck({ deck }: { deck: TopicCards }) {
  const t = useT()
  const router = useRouter()
  const [queue, setQueue] = useState<StudyCard[]>(() => deck.cards.filter((card) => card.due))
  const [position, setPosition] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [unsaved, setUnsaved] = useState(0)
  const [, startSave] = useTransition()

  const current = queue[position] ?? null

  function rate(rating: Rating) {
    if (!current) return
    const card = current
    setReviewed((n) => n + 1)
    setRevealed(false)
    setPosition((n) => n + 1)
    startSave(async () => {
      try {
        const result = await reviewCard(card.id, rating)
        if (!result.ok) setUnsaved((n) => n + 1)
        else router.refresh()
      } catch {
        setUnsaved((n) => n + 1)
      }
    })
  }

  function studyAll() {
    setQueue(deck.cards)
    setPosition(0)
    setRevealed(false)
  }

  // Space turns the card; the number keys rate it once it is turned. The
  // grip a deck needs: both hands stay where they are.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || !current) return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      if (event.key === ' ' || event.key === 'Enter') {
        // The card itself is a button, so let a press on it act normally.
        if (target instanceof HTMLButtonElement) return
        event.preventDefault()
        setRevealed((shown) => !shown)
        return
      }
      if (!revealed) return
      const number = Number(event.key)
      if (Number.isInteger(number) && number >= 1 && number <= RATINGS.length) {
        event.preventDefault()
        rate(RATINGS[number - 1]!.value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="space-y-6">
      {current ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="tabular-nums">
              {t.cards.positionOf(position + 1, queue.length)}
            </span>
            <span className="tabular-nums">{t.cards.reviewed(reviewed)}</span>
          </div>
          <Meter
            value={(position / queue.length) * 100}
            className="h-1"
            label={t.cards.progressLabel}
          />
          <p className="text-xs text-muted-foreground">
            {t.cards.ownJudgement}
          </p>

          {/* Two faces of one card rather than an answer appended underneath.
              The turn is the moment the recall either happened or did not, and
              it is worth showing as a single object changing rather than as new
              text arriving. Keyed on the card so the next one starts face-up
              instead of visibly rotating back. */}
          <div className="flip-scene">
            <button
              type="button"
              key={current.id}
              onClick={() => setRevealed((shown) => !shown)}
              aria-expanded={revealed}
              aria-label={revealed ? t.cards.hideAnswer : t.cards.showAnswer}
              className="flip-card relative block min-h-56 w-full text-left"
              data-face={revealed ? 'back' : 'front'}
            >
              <span
                aria-hidden={revealed}
                className={cn(
                  cardClass,
                  'flip-face flex min-h-56 w-full flex-col justify-center p-6 sm:p-8',
                )}
              >
                <span className="text-lg leading-8 text-balance">{current.front}</span>
              </span>

              <span
                aria-hidden={!revealed}
                className={cn(
                  cardClass,
                  'flip-face flip-face-back absolute inset-0 flex flex-col justify-center p-6 sm:p-8',
                )}
              >
                <span className="leading-7 text-pretty">{current.back}</span>
                {current.attribution ? (
                  <span className="mt-3 text-xs text-muted-foreground">{current.attribution}</span>
                ) : null}
              </span>
            </button>
          </div>

          {revealed ? (
            <div className="disclose grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RATINGS.map((rating, index) => (
                <Button
                  key={rating.value}
                  variant={
                    rating.value === 0 ? 'destructive' : rating.value === 3 ? 'default' : 'outline'
                  }
                  size="lg"
                  onClick={() => rate(rating.value)}
                  className="h-auto flex-col items-start gap-0.5 py-2.5"
                >
                  <span className="flex w-full items-center gap-1.5 font-medium">
                    {t.cards.ratings[rating.key].label}
                    <Kbd className="ml-auto">{index + 1}</Kbd>
                  </span>
                  <span className="text-xs opacity-70">
                    {intervalAfter(current.state, rating.value, t.cards.interval)}
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <Button size="lg" className="w-full" onClick={() => setRevealed(true)}>
              {t.cards.showAnswerKey} <Kbd className="ml-1.5">{t.cards.space}</Kbd>
            </Button>
          )}

          {/* A rating that did not save leaves the card due, which is the
              harmless failure — but saying nothing would make the schedule
              look like it had moved when it had not. */}
          {unsaved > 0 ? (
            <p className="disclose flex items-center gap-2 rounded-lg bg-warning/10 p-2.5 text-xs text-warning">
              <TriangleAlert className="size-3.5 shrink-0" />
              {t.cards.unsaved(unsaved)}
            </p>
          ) : null}
        </div>
      ) : (
        <div className={cn(cardClass, 'p-6 text-center sm:p-8')}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
            {reviewed > 0 ? <Check className="size-6" /> : <Layers className="size-6" />}
          </div>
          <h2 className="mt-4 font-semibold">
            {reviewed > 0 ? t.cards.doneCount(reviewed) : t.cards.nothingDue}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {deck.cards.length === 0 ? t.cards.noCards : t.cards.comeBack}
          </p>
          {deck.cards.length > 0 ? (
            <Button variant="outline" className="mt-5" onClick={studyAll}>
              {t.cards.goThroughAll(deck.cards.length)}
            </Button>
          ) : null}
        </div>
      )}

      <OwnCards deck={deck} />
    </div>
  )
}

function OwnCards({ deck }: { deck: TopicCards }) {
  const t = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [error, setError] = useState('')
  const [pending, startSubmit] = useTransition()

  const mine = useMemo(() => deck.cards.filter((card) => card.own), [deck.cards])

  function submit() {
    setError('')
    startSubmit(async () => {
      try {
        const result = await createCard(deck.topicId, front, back)
        if (!result.ok) {
          setError(result.error ?? t.cards.notSaved)
          return
        }
        setFront('')
        setBack('')
        setOpen(false)
        router.refresh()
      } catch {
        setError(t.common.offline)
      }
    })
  }

  function remove(id: string) {
    startSubmit(async () => {
      try {
        await deleteCard(id)
        router.refresh()
      } catch {
        setError(t.cards.notRemoved)
      }
    })
  }

  return (
    <section className={cn(cardClass, 'p-5 sm:p-6')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t.cards.ownCards}</h2>
          <p className="text-sm text-muted-foreground">{t.cards.privateNote}</p>
        </div>
        <Button variant={open ? 'ghost' : 'outline'} onClick={() => setOpen(!open)}>
          {open ? (
            t.common.cancel
          ) : (
            <>
              <Plus className="size-4" /> {t.cards.addCard}
            </>
          )}
        </Button>
      </div>

      {open ? (
        <div className="disclose mt-4 space-y-3">
          <Input
            value={front}
            onChange={(event) => setFront(event.target.value)}
            placeholder={t.cards.frontPlaceholder}
            maxLength={300}
            autoFocus
          />
          <Textarea
            value={back}
            onChange={(event) => setBack(event.target.value)}
            placeholder={t.cards.backPlaceholder}
            className="min-h-24"
            maxLength={1000}
          />
          {error ? (
            <p role="alert" className="disclose text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button onClick={submit} disabled={pending || !front.trim() || !back.trim()}>
            {pending ? `${t.common.saving}…` : t.cards.saveCard}
          </Button>
        </div>
      ) : null}

      {mine.length ? (
        <ul className="mt-4 space-y-2">
          {mine.map((card) => (
            <li
              key={card.id}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 ring-1 ring-foreground/10"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{card.front}</span>
                <span className="block truncate text-xs text-muted-foreground">{card.back}</span>
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t.cards.deleteCard}
                disabled={pending}
                onClick={() => remove(card.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
