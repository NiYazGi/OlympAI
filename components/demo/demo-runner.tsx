'use client'

import { useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Lightbulb, Loader2 } from 'lucide-react'
import { checkDemo } from '@/app/try/actions'
import { AiThinking } from '@/components/ai-thinking'
import { AttemptProtocol } from '@/components/problems/attempt-protocol'
import { Button, buttonVariants } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import type { Protocol } from '@/lib/protocol'
import { cardClass, cn, fieldClass } from '@/lib/utils'

type Item = { id: string; subject: string; title: string; statement: ReactNode; hints: ReactNode[] }

/** One demo problem at a time: hints one by one, then the real check of the solution. */
export function DemoRunner({ items }: { items: Item[] }) {
  const t = useT()
  const [active, setActive] = useState(items[0]?.id ?? '')
  const [shown, setShown] = useState<Record<string, number>>({})
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, Protocol>>({})
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const item = items.find((entry) => entry.id === active) ?? items[0]
  if (!item) return null
  const hintsShown = shown[item.id] ?? 0
  const result = results[item.id]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist">
        {items.map((entry) => (
          <button
            key={entry.id}
            role="tab"
            aria-selected={entry.id === item.id}
            onClick={() => {
              setActive(entry.id)
              setError('')
            }}
            className={cn('rounded-full border px-4 py-1.5 text-sm', entry.id === item.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-foreground/[0.04]')}
          >
            {t(entry.subject)}
          </button>
        ))}
      </div>

      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <h2 className="text-lg font-semibold">{item.title}</h2>
        <div className="mt-3">{item.statement}</div>

        <div className="mt-5 space-y-2">
          {item.hints.slice(0, hintsShown).map((hint, index) => (
            <div key={index} className="flex gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
              <div className="min-w-0">
                <span className="font-medium">{t('Hint {n}', { n: index + 1 })}: </span>
                {hint}
              </div>
            </div>
          ))}
          {hintsShown < item.hints.length ? (
            <Button variant="outline" size="sm" onClick={() => setShown((current) => ({ ...current, [item.id]: hintsShown + 1 }))}>
              <Lightbulb className="size-4" /> {hintsShown ? t('Next hint') : t('Get a hint')}
            </Button>
          ) : null}
        </div>
      </section>

      {result ? (
        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <AttemptProtocol protocol={result} />
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Link href="/signup" className={buttonVariants()}>
              {t('Create a free account')} <ArrowRight className="size-4" />
            </Link>
            <Button variant="ghost" onClick={() => setResults((current) => { const next = { ...current }; delete next[item.id]; return next })}>
              {t('Try again')}
            </Button>
            <p className="w-full text-xs text-muted-foreground">{t('With an account the check is saved, the mistake goes to your log, and the plan picks the next problem for you.')}</p>
          </div>
        </section>
      ) : (
        <section className={cn(cardClass, 'space-y-3 p-5 sm:p-6')}>
          <label className="block text-sm font-medium" htmlFor="demo-answer">{t('Your solution')}</label>
          <textarea
            id="demo-answer"
            className={cn(fieldClass, 'min-h-48 py-2 font-mono text-sm')}
            maxLength={6000}
            value={answers[item.id] ?? ''}
            onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))}
            placeholder={t('Write the solution line by line, the way you would on paper. Each line gets its own mark.')}
          />
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-4">
            <Button
              disabled={pending || (answers[item.id] ?? '').trim().length < 15}
              onClick={() => {
                setError('')
                start(async () => {
                  const outcome = await checkDemo(item.id, answers[item.id] ?? '')
                  if (!outcome.ok) setError(outcome.error)
                  else setResults((current) => ({ ...current, [item.id]: outcome.protocol }))
                })
              }}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t('Check the solution')}
            </Button>
            {pending ? <AiThinking kind="grading" /> : null}
          </div>
          <p className="text-xs text-muted-foreground">{t('Nothing is saved. A few checks per hour without an account.')}</p>
        </section>
      )}
    </div>
  )
}
