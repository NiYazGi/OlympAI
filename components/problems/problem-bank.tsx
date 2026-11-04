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
import { DifficultyStars, difficultyLabel } from '@/components/difficulty-stars'
import { EmptyState } from '@/components/empty-state'
import { cardClass, cn, riseDelay } from '@/lib/utils'
import { xpForFirstSolve } from '@/lib/xp'
import type { CatalogueTask } from '@/lib/types'
import { useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'

const ALL_SUBJECTS = 'All subjects'
const ALL_TOPICS = 'All topics'
const ALL_OLYMPIADS = 'All olympiads'

/** "Областная олимпиада, 2004" → "Областная олимпиада": the olympiad, without the sitting. */
function olympiadOf(task: { source: string | null; title: string }) {
  const text = task.source ?? task.title
  const match = text.match(/^(.*?)[\s,]*(?:19|20)\d{2}/)
  return match?.[1]?.trim() || null
}
const ALL_LEVELS = 'All levels'
const ALL_STATES = 'All'
const DIFFICULTIES = [ALL_LEVELS, 'Easy', 'Medium', 'Hard']
const STATES = [ALL_STATES, 'Solved', 'Unsolved', 'Attempted']
const ALL_GRADES = 'All grades'
/** Rendered in pages: a library of nearly two thousand rows cannot be one list. */
const PAGE = 40

/** "9 класс" for a single grade, "10–11 класс" for a band. */
export function gradeLabel(task: Pick<CatalogueTask, 'gradeMin' | 'gradeMax'>, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (task.gradeMin === null || task.gradeMax === null) return null
  return task.gradeMin === task.gradeMax
    ? t('Grade {n}', { n: task.gradeMin })
    : t('Grades {from}–{to}', { from: task.gradeMin, to: task.gradeMax })
}

function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  label: string
}) {
  const t = useT()
  return (
    <Select value={value} onValueChange={(next) => onChange(next as string)}>
      <SelectTrigger className="h-9 w-full sm:w-auto" aria-label={label}>
        <SelectValue>{(current: string) => t(current)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {t(option)}
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
  const t = useT()

  // ?topic= is how the ladder's "Apply" step arrives here. It seeds the filter
  // and nothing more: the selects stay in charge afterwards, so changing one
  // does not have to fight the URL it was opened from.
  const requestedTopic = useSearchParams().get('topic')
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState(ALL_SUBJECTS)
  const [difficulty, setDifficulty] = useState(ALL_LEVELS)
  const [topic, setTopic] = useState(() =>
    requestedTopic && tasks.some((task) => task.topic === requestedTopic)
      ? requestedTopic
      : ALL_TOPICS,
  )
  const [state, setState] = useState(ALL_STATES)
  const [grade, setGrade] = useState(ALL_GRADES)
  const [olympiad, setOlympiad] = useState(ALL_OLYMPIADS)

  // Filter options come from the rows actually present, so they cannot drift
  // out of sync with the catalogue the way two hand-kept lists did.
  const subjects = useMemo(
    () => [ALL_SUBJECTS, ...[...new Set(tasks.map((task) => task.subject))].sort()],
    [tasks],
  )
  // One subject on the page means the subject select can only say what the
  // heading already says, so it is not rendered.
  const showSubjectFilter = subjects.length > 2
  const topics = useMemo(
    () =>
      [
        ALL_TOPICS,
        ...[
          ...new Set(
            tasks
              .filter((task) => subject === ALL_SUBJECTS || task.subject === subject)
              .map((task) => task.topic),
          ),
        ].sort(),
      ],
    [tasks, subject],
  )

  // Single grades present in the library, each a filter option: a band task
  // (10-11) is listed under both of its grades.
  const grades = useMemo(() => {
    const present = new Set<number>()
    for (const task of tasks) {
      if (task.gradeMin === null || task.gradeMax === null) continue
      for (let g = task.gradeMin; g <= task.gradeMax; g++) present.add(g)
    }
    return [ALL_GRADES, ...[...present].sort((a, b) => a - b).map((g) => `Grade ${g}`)]
  }, [tasks])
  const showGradeFilter = grades.length > 2

  // The archive's olympiads, so a whole one can be found at once: searching a
  // title only ever matched the spelling it was typed in.
  const olympiads = useMemo(
    () => [
      ALL_OLYMPIADS,
      ...[
        ...new Set(
          tasks
            .filter((task) => subject === ALL_SUBJECTS || task.subject === subject)
            .map(olympiadOf)
            .filter((name): name is string => Boolean(name)),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    ],
    [tasks, subject],
  )

  const filtered = useMemo(
    () =>
      tasks.filter((task) => {
        if (query && !task.title.toLowerCase().includes(query.trim().toLowerCase())) return false
        if (subject !== ALL_SUBJECTS && task.subject !== subject) return false
        if (topic !== ALL_TOPICS && task.topic !== topic) return false
        if (olympiad !== ALL_OLYMPIADS && olympiadOf(task) !== olympiad) return false
        if (grade !== ALL_GRADES) {
          const g = Number(grade.slice('Grade '.length))
          if (task.gradeMin === null || task.gradeMax === null || g < task.gradeMin || g > task.gradeMax) return false
        }
        if (difficulty !== ALL_LEVELS && difficultyLabel(task.difficulty) !== difficulty) {
          return false
        }
        if (state === 'Solved' && !task.solved) return false
        if (state === 'Unsolved' && task.solved) return false
        if (state === 'Attempted' && task.attempts === 0) return false
        return true
      }),
    [tasks, query, subject, topic, difficulty, state, grade, olympiad],
  )

  // How many of the filtered rows are on screen. Changing any filter starts
  // again from the first page, so the key carries the filters it was shown for.
  const filterKey = [query, subject, topic, difficulty, state, grade, olympiad].join('\u0000')
  const [shown, setShown] = useState({ key: filterKey, count: PAGE })
  const count = shown.key === filterKey ? shown.count : PAGE
  const page = filtered.slice(0, count)

  if (tasks.length === 0) {
    // Deliberately not "apply the migrations in supabase/migrations": that was
    // an instruction for whoever runs the server, shown to students.
    return (
      <EmptyState
        icon={Library}
        title={t('No tasks here yet')}
        body={t('Nothing has been added to the library for this workspace. Sulu can still work through a problem with you in the meantime.')}
        action={{ href: '/sulu-ai', label: t('Open Sulu AI') }}
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
            placeholder={t('Search problems…')}
            aria-label={t('Search problems')}
            className="h-9 pl-9"
          />
        </div>
        {showSubjectFilter ? (
          <FilterSelect
            label={t('Subject')}
            value={subject}
            onChange={(next) => {
              setSubject(next)
              setTopic(ALL_TOPICS)
              setOlympiad(ALL_OLYMPIADS)
            }}
            options={subjects}
          />
        ) : null}
        {showGradeFilter ? (
          <FilterSelect label={t('Grade')} value={grade} onChange={setGrade} options={grades} />
        ) : null}
        <FilterSelect label={t('Topic')} value={topic} onChange={setTopic} options={topics} />
        {olympiads.length > 2 ? (
          <FilterSelect label={t('Olympiad')} value={olympiad} onChange={setOlympiad} options={olympiads} />
        ) : null}
        <FilterSelect
          label={t('Difficulty')}
          value={difficulty}
          onChange={setDifficulty}
          options={DIFFICULTIES}
        />
        <FilterSelect label={t('Status')} value={state} onChange={setState} options={STATES} />
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t('{shown} of {total} problems', { shown: filtered.length, total: tasks.length })}
      </p>

      {filtered.length === 0 ? (
        <div className={cn(cardClass, 'p-8 text-center text-sm text-muted-foreground')}>
          {t('No problem matches these filters.')}
        </div>
      ) : (
        <ul className="grid gap-3">
          {page.map((task, index) => (
            <li key={task.id} className="rise" style={riseDelay(index % PAGE)}>
              <Link
                href={`/tasks/${task.id}`}
                className={cn(
                  cardClass,
                  'flex flex-col gap-3 p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5',
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
                        <Check className="size-3" /> {t('Solved')}
                      </Badge>
                    ) : task.attempts > 0 ? (
                      <Badge variant="outline">
                        {t('Attempts: {n}', { n: task.attempts })}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(task.subject)} · {t(task.topic)}
                    {gradeLabel(task, t) ? ` · ${gradeLabel(task, t)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {!task.solved ? (
                    <span
                      title={t('XP for a first solve')}
                      className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
                    >
                      <Zap className="size-3" />
                      {xpForFirstSolve(task.difficulty)}
                    </span>
                  ) : null}
                  {task.estimatedMinutes ? (
                    <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                      <Clock className="size-3.5" /> {task.estimatedMinutes} {t('min')}
                    </span>
                  ) : null}
                  <DifficultyStars level={task.difficulty} />
                  <ArrowRight aria-hidden className="hidden size-4 text-muted-foreground sm:block" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {filtered.length > count ? (
        <Button
          variant="outline"
          className="self-center"
          onClick={() => setShown({ key: filterKey, count: count + PAGE })}
        >
          {t('Show {n} more', { n: Math.min(PAGE, filtered.length - count) })}
        </Button>
      ) : null}
    </div>
  )
}
