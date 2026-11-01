'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Lightbulb, ListChecks, PencilRuler, Quote } from 'lucide-react'
import { markLessonOpened, setLessonComplete } from '@/app/(app)/learn/actions'
import { Button } from '@/components/ui/button'
import { Figure } from '@/components/learn/figure'
import type { Lesson, LessonBlock } from '@/lib/types'
import { useT } from '@/components/i18n-provider'
import { cardClass, cn, riseDelay } from '@/lib/utils'

const BLOCK: Record<
  LessonBlock['kind'],
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  concept: {
    label: 'concept',
    icon: Lightbulb,
    className: 'bg-accent text-accent-foreground',
  },
  explanation: { label: 'explanation', icon: Quote, className: 'bg-card' },
  example: { label: 'example', icon: PencilRuler, className: 'bg-card' },
  key_facts: { label: 'key_facts', icon: ListChecks, className: 'bg-card' },
}

/**
 * A lesson, as blocks rather than a page of prose.
 *
 * The format is the teaching decision: an idea, why it holds, one worked case,
 * and the short list worth memorising. Long enough to say something, short
 * enough that the check step follows while it is still in mind.
 */
export function LessonReader({ lesson }: { lesson: Lesson }) {
  const router = useRouter()
  const [completed, setCompleted] = useState(Boolean(lesson.completedAt))
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const t = useT()

  // Recorded once, on arrival. "Opened" is a fact about this student's reading
  // and the only one available without asking them to grade themselves.
  useEffect(() => {
    if (!lesson.openedAt) void markLessonOpened(lesson.id)
  }, [lesson.id, lesson.openedAt])

  function toggle() {
    const next = !completed
    setCompleted(next)
    setError('')
    startTransition(async () => {
      try {
        const result = await setLessonComplete(lesson.id, next)
        if (!result.ok) {
          setCompleted(!next)
          setError(result.error ?? t.lesson.notSaved)
        } else router.refresh()
      } catch {
        // Optimistic, so the tick has to come back off if the write did not
        // land — otherwise the page claims a state the database never got.
        setCompleted(!next)
        setError(t.common.offline)
      }
    })
  }

  return (
    <div className="space-y-4">
      {lesson.summary ? (
        <p className="font-reading text-base leading-7 text-pretty text-muted-foreground">
          {lesson.summary}
        </p>
      ) : null}

      <ol className="space-y-4">
        {lesson.blocks.map((block, index) => {
          const spec = BLOCK[block.kind]
          const Icon = spec.icon
          return (
            <li
              key={block.id}
              className={cn(cardClass, spec.className, 'rise p-5 sm:p-6')}
              style={riseDelay(index, 60)}
            >
              <div className="flex items-center gap-2 text-caption font-semibold">
                <Icon className="size-3.5" />
                {t.lesson.blocks[spec.label] ?? spec.label}
                <span className="ml-auto font-mono tabular-nums opacity-60">
                  {index + 1}/{lesson.blocks.length}
                </span>
              </div>

              {block.heading ? (
                <h2 className="mt-3 text-lg font-semibold text-balance">{block.heading}</h2>
              ) : null}

              {block.body ? (
                <div className="mt-2 space-y-3">
                  {block.body.split('\n\n').map((paragraph, i) => (
                    <p
                      key={i}
                      className={cn(
                        'font-reading text-reading text-pretty',
                        block.kind === 'example' && 'font-mono text-sm leading-relaxed',
                      )}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : null}

              {block.figure ? (
                <div className="mt-4">
                  <Figure spec={block.figure} />
                </div>
              ) : null}

              {block.items.length ? (
                <ul className="mt-3 space-y-2">
                  {block.items.map((item) => (
                    <li key={item} className="font-reading flex items-start gap-2.5 text-sm leading-6">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ol>

      <div
        className={cn(cardClass, 'flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5')}
      >
        <div>
          <p className="flex items-center gap-2 font-medium">
            {completed ? (
              <>
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </span>
                {t.lesson.markedRead}
              </>
            ) : (
              t.lesson.finished
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {t.lesson.ownNote}
          </p>
          {error ? (
            <p role="alert" className="disclose mt-1 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant={completed ? 'outline' : 'default'} onClick={toggle} disabled={pending}>
            {completed ? (
              t.lesson.notYet
            ) : (
              <>
                <Check className="size-4" /> {t.lesson.markRead}
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            nativeButton={false}
            render={
              <Link href={`/learn/${lesson.topicSlug}/quiz`} prefetch>
                {t.lesson.checkYourself}
              </Link>
            }
          />
        </div>
      </div>
    </div>
  )
}
