'use client'

import { useMemo, useState, ViewTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Check, Clock, Library, Search, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DifficultyStars, difficultyKey } from '@/components/difficulty-stars'
import { EmptyState } from '@/components/empty-state'
import { useT } from '@/components/i18n-provider'
import { cardClass, cn, liftClass, riseDelay } from '@/lib/utils'
import { xpForFirstSolve } from '@/lib/xp'
import type { CatalogueTask } from '@/lib/types'

/**
 * Every filter stores a key and shows a label.
 *
 * They used to be the same string — selecting "Hard" compared the caption
 * against a caption — which is a filter that silently matches nothing the
 * moment the interface is in another language. `ANY` is the empty string so a
 * cleared filter and an unset one are the same thing.
 */
const ANY = ''

type Option = { value: string; label: string }

function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string
  onChange: (value: string) => void
  options: Option[]
  label: string
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as string)}>
      <SelectTrigger className="h-9 w-full sm:w-auto" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Renders the catalogue passed down from the server.
 *
 * It used to import a nine-row array from lib/data.ts whose `solved` flags were
 * literals, so the same three tasks showed a green tick for every account while
 * the identical rows in the database went unread.
 */
export function ProblemBank({ tasks }: { tasks: CatalogueTask[] }) {
  // ?topic= is how the ladder's "Apply" step arrives here. It seeds the filter
  // and nothing more: the selects stay in charge afterwards, so changing one
  // does not have to fight the URL it was opened from.
  const t = useT()
  const requestedTopic = useSearchParams().get('topic')
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState(ANY)
  const [difficulty, setDifficulty] = useState(ANY)
  const [topic, setTopic] = useState(() =>
    requestedTopic && tasks.some((task) => task.topic === requestedTopic) ? requestedTopic : ANY,
  )
  const [state, setState] = useState(ANY)
  const [stage, setStage] = useState(ANY)

  // Filter options come from the rows actually present, so they cannot drift
  // out of sync with the catalogue the way two hand-kept lists did.
  const subjects = useMemo<Option[]>(
    () => [
      { value: ANY, label: t.bank.allSubjects },
      ...[...new Set(tasks.map((task) => task.subject))]
        .sort()
        .map((value) => ({ value, label: t.subjects[value] ?? value })),
    ],
    [tasks, t],
  )
  // One subject on the page means the subject select can only say what the
  // heading already says, so it is not rendered.
  const showSubjectFilter = subjects.length > 2
  const topics = useMemo<Option[]>(
    () => [
      { value: ANY, label: t.bank.allTopics },
      ...[
        ...new Set(
          tasks.filter((task) => !subject || task.subject === subject).map((task) => task.topic),
        ),
      ]
        .sort()
        .map((value) => ({ value, label: t.topics[value] ?? value })),
    ],
    [tasks, subject, t],
  )

  // Only offered when the catalogue actually holds more than one stage: a
  // filter whose every choice returns the same rows is furniture.
  const stages = useMemo<Option[]>(() => {
    const present = [...new Set(tasks.map((task) => task.level).filter(Boolean))] as string[]
    if (present.length < 2) return []
    const order = ['oblast', 'republican', 'international']
    return [
      { value: ANY, label: t.bank.allStages },
      ...present
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
        .map((value) => ({ value, label: t.bank.stages[value] ?? value })),
    ]
  }, [tasks, t])

  const difficulties: Option[] = [
    { value: ANY, label: t.bank.allLevels },
    { value: 'easy', label: t.bank.easy },
    { value: 'medium', label: t.bank.medium },
    { value: 'hard', label: t.bank.hard },
  ]
  const states: Option[] = [
    { value: ANY, label: t.bank.allStates },
    { value: 'solved', label: t.bank.solved },
    { value: 'unsolved', label: t.bank.unsolved },
    { value: 'attempted', label: t.bank.attempted },
  ]

  const filtered = useMemo(
    () =>
      tasks.filter((task) => {
        if (query && !task.title.toLowerCase().includes(query.trim().toLowerCase())) return false
        if (subject && task.subject !== subject) return false
        if (topic && task.topic !== topic) return false
        if (stage && task.level !== stage) return false
        if (difficulty && difficultyKey(task.difficulty) !== difficulty) return false
        if (state === 'solved' && !task.solved) return false
        if (state === 'unsolved' && task.solved) return false
        if (state === 'attempted' && task.attempts === 0) return false
        return true
      }),
    [tasks, query, subject, topic, difficulty, state, stage],
  )

  if (tasks.length === 0) {
    // Deliberately not "apply the migrations in supabase/migrations": that was
    // an instruction for whoever runs the server, shown to students.
    return (
      <EmptyState
        icon={Library}
        title={t.bank.emptyTitle}
        body={t.bank.emptyBody}
        action={{ href: '/sulu-ai', label: t.bank.emptyAction }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.bank.searchPlaceholder}
            aria-label={t.bank.searchPlaceholder}
            className="h-9 pl-9"
          />
        </div>
        {showSubjectFilter ? (
          <FilterSelect
            label={t.bank.subject}
            value={subject}
            onChange={(next) => {
              setSubject(next)
              setTopic(ANY)
            }}
            options={subjects}
          />
        ) : null}
        {stages.length ? (
          <FilterSelect
            label={t.bank.stage}
            value={stage}
            onChange={setStage}
            options={stages}
          />
        ) : null}
        <FilterSelect label={t.bank.topic} value={topic} onChange={setTopic} options={topics} />
        <FilterSelect
          label={t.bank.difficulty}
          value={difficulty}
          onChange={setDifficulty}
          options={difficulties}
        />
        <FilterSelect label={t.bank.status} value={state} onChange={setState} options={states} />
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t.bank.count(filtered.length, tasks.length)}
      </p>

      {filtered.length === 0 ? (
        <div className={cn(cardClass, 'p-8 text-center text-sm text-muted-foreground')}>
          {t.bank.noMatch}
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((task, index) => (
            <li key={task.id} className="rise" style={riseDelay(index)}>
              <Link
                href={`/tasks/${task.id}`}
                className={cn(
                  cardClass,
                  liftClass,
                  'group flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5',
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">
                      <ViewTransition name={`task-${task.id}`} share="morph" default="none">
                        <span>{task.title}</span>
                      </ViewTransition>
                    </h3>
                    {task.solved ? (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="size-3" /> {t.bank.solved}
                      </Badge>
                    ) : task.attempts > 0 ? (
                      <Badge variant="outline">
                        {t.bank.attemptsBadge(task.attempts)}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[
                      task.level ? (t.bank.stages[task.level] ?? task.level) : null,
                      t.subjects[task.subject] ?? task.subject,
                      t.topics[task.topic] ?? task.topic,
                    ]
                      .filter(Boolean)
                      .join(' · ')}

                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {!task.solved ? (
                    <span
                      title={t.bank.firstSolveXp}
                      className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
                    >
                      <Zap className="size-3" />
                      {xpForFirstSolve(task.difficulty)}
                    </span>
                  ) : null}
                  {task.estimatedMinutes ? (
                    <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                      <Clock className="size-3.5" /> {t.tasks.minutes(task.estimatedMinutes)}
                    </span>
                  ) : null}
                  <DifficultyStars
                    level={task.difficulty}
                    label={t.bank.difficultyAria(task.difficulty)}
                  />
                  <ArrowRight
                    aria-hidden
                    className="hidden size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 sm:block"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
