'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Layers, Plus, Trash2 } from 'lucide-react'
import { createCard, deleteCard, reviewCard } from '@/app/(app)/learn/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { intervalAfter, RATINGS, type Rating } from '@/lib/srs'
import type { StudyCard, TopicCards } from '@/lib/types'
import { cardClass, cn } from '@/lib/utils'

/**
 * The recall step.
 *
 * Cards arrive already ordered by lib/srs.ts — overdue first, new after — so
 * the queue here is just that list walked in order. The four ratings say when
 * the card comes back, and each button states the interval it buys rather than
 * leaving the student to guess what "Hard" costs them.
 */
export function CardDeck({ deck }: { deck: TopicCards }) {
  const router = useRouter()
  const [queue, setQueue] = useState<StudyCard[]>(() => deck.cards.filter((card) => card.due))
  const [position, setPosition] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [pending, startTransition] = useTransition()

  const current = queue[position] ?? null

  function rate(rating: Rating) {
    if (!current || pending) return
    startTransition(async () => {
      await reviewCard(current.id, rating)
      setReviewed((n) => n + 1)
      setRevealed(false)
      setPosition((n) => n + 1)
      router.refresh()
    })
  }

  function studyAll() {
    setQueue(deck.cards)
    setPosition(0)
    setRevealed(false)
  }

  return (
    <div className="space-y-6">
      {current ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="tabular-nums">
              {position + 1} of {queue.length}
            </span>
            <span className="tabular-nums">{reviewed} reviewed</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Rating a card is your own judgement, so it moves this topic&apos;s progress rather than
            your XP. The quiz is where answers are marked.
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
              aria-label={revealed ? 'Hide the answer' : 'Show the answer'}
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
            <div className="animate-in fade-in slide-in-from-bottom-2 grid grid-cols-2 gap-2 duration-300 sm:grid-cols-4">
              {RATINGS.map((rating) => (
                <Button
                  key={rating.value}
                  variant={rating.value === 0 ? 'destructive' : rating.value === 3 ? 'default' : 'outline'}
                  size="lg"
                  disabled={pending}
                  onClick={() => rate(rating.value)}
                  className="h-auto flex-col items-start gap-0.5 py-2.5"
                >
                  <span className="font-medium">{rating.label}</span>
                  <span className="text-xs opacity-70">
                    {intervalAfter(current.state, rating.value)}
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full transition-transform"
              onClick={() => setRevealed(true)}
            >
              Show answer
            </Button>
          )}
        </div>
      ) : (
        <div className={cn(cardClass, 'p-6 text-center sm:p-8')}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
            {reviewed > 0 ? <Check className="size-6" /> : <Layers className="size-6" />}
          </div>
          <h2 className="mt-4 font-semibold">
            {reviewed > 0 ? `${reviewed} reviewed. Nothing else is due.` : 'Nothing is due right now.'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {deck.cards.length === 0
              ? 'This topic has no cards yet — write your own below and they start showing up here.'
              : 'Coming back on the day a card is due is the whole point of the spacing. You can still run through the deck early.'}
          </p>
          {deck.cards.length > 0 ? (
            <Button variant="outline" className="mt-5" onClick={studyAll}>
              Go through all {deck.cards.length}
            </Button>
          ) : null}
        </div>
      )}

      <OwnCards deck={deck} />
    </div>
  )
}

function OwnCards({ deck }: { deck: TopicCards }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const mine = useMemo(() => deck.cards.filter((card) => card.own), [deck.cards])

  function submit() {
    setError('')
    startTransition(async () => {
      const result = await createCard(deck.topicId, front, back)
      if (!result.ok) {
        setError(result.error ?? 'The card could not be saved.')
        return
      }
      setFront('')
      setBack('')
      setOpen(false)
      router.refresh()
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteCard(id)
      router.refresh()
    })
  }

  return (
    <section className={cn(cardClass, 'p-5 sm:p-6')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Your own cards</h2>
          <p className="text-sm text-muted-foreground">
            Private to you, and scheduled alongside the shared ones.
          </p>
        </div>
        <Button variant={open ? 'ghost' : 'outline'} onClick={() => setOpen(!open)}>
          {open ? 'Cancel' : <><Plus className="size-4" /> Add a card</>}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3">
          <Input
            value={front}
            onChange={(event) => setFront(event.target.value)}
            placeholder="Front — the prompt, e.g. “What is active transport?”"
            maxLength={300}
          />
          <Textarea
            value={back}
            onChange={(event) => setBack(event.target.value)}
            placeholder="Back — what you want to recall"
            className="min-h-24"
            maxLength={1000}
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button onClick={submit} disabled={pending || !front.trim() || !back.trim()}>
            Save card
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
                aria-label="Delete card"
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
