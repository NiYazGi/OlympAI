'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useState, useTransition } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { findTrackTasks, saveTrack } from '@/app/(app)/class/actions'
import { DifficultyStars } from '@/components/difficulty-stars'
import { useLocale, useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { formatDay } from '@/lib/i18n/config'
import { cn } from '@/lib/utils'
import type { TrackPick, TrackRow } from '@/lib/supabase/track'

/**
 * The class's plan, as the teacher writes it.
 *
 * Each section can be moved, given a quota, and — opened — left out of the
 * route, given a deadline, given a note, or given a list of problems the
 * teacher chose instead of the easiest N. Until this the route was a template
 * a teacher could only reorder; a teacher's plan is more than an order.
 *
 * Arrows rather than drag and drop, for sections and for chosen problems
 * alike. A teacher moves a section two places, not across a scroll, and an
 * arrow works on a phone, with a keyboard, and for somebody using a screen
 * reader — all three of which drag-and-drop would have had to earn separately.
 *
 * Nothing is saved until Save: a plan is several changes that are only
 * coherent together, and a student should not be re-routed between them.
 */
export function TrackEditor({
  classId,
  rows,
  defaultTarget,
}: {
  classId: string
  rows: TrackRow[]
  defaultTarget: number
}) {
  const t = useT()
  const router = useRouter()
  const [order, setOrder] = useState(rows)
  const [open, setOpen] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  function change(next: TrackRow[]) {
    setOrder(next)
    setDirty(true)
    setSaved(false)
  }

  function move(index: number, by: -1 | 1) {
    const next = [...order]
    const to = index + by
    if (to < 0 || to >= next.length) return
    ;[next[index], next[to]] = [next[to]!, next[index]!]
    change(next)
  }

  function update(topicId: string, patch: Partial<TrackRow>) {
    change(order.map((row) => (row.topicId === topicId ? { ...row, ...patch } : row)))
  }

  function retarget(topicId: string, value: string) {
    const parsed = value.trim() === '' ? null : Number(value)
    update(topicId, { target: parsed !== null && Number.isFinite(parsed) ? parsed : null })
  }

  function save() {
    setError('')
    const formData = new FormData()
    formData.set('class_id', classId)
    formData.set(
      'track',
      JSON.stringify(
        order.map((row) => ({
          topicId: row.topicId,
          target: row.target,
          skipped: row.skipped,
          due: row.due,
          note: row.note,
          picks: row.picks.map((pick) => pick.id),
        })),
      ),
    )
    startTransition(async () => {
      const result = await saveTrack(formData)
      if (!result.ok) {
        setError(result.error ?? t.common.notSaved)
        return
      }
      setDirty(false)
      setSaved(true)
      router.refresh()
    })
  }

  /** Back to the syllabus: the default order, every section, nothing chosen. */
  function reset() {
    change(
      rows
        .map((row) => ({ ...row, target: null, skipped: false, due: null, note: null, picks: [] }))
        .sort((a, b) => a.position - b.position || a.topic.localeCompare(b.topic)),
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">{t.classes.trackNote(defaultTarget)}</p>
      <p className="text-sm leading-6 text-muted-foreground">{t.classes.trackNote2}</p>

      <ol className="grid gap-1.5">
        {order.map((row, index) => (
          <Section
            key={row.topicId}
            classId={classId}
            row={row}
            index={index}
            last={index === order.length - 1}
            open={open === row.topicId}
            defaultTarget={defaultTarget}
            onToggle={() => setOpen(open === row.topicId ? null : row.topicId)}
            onMove={(by) => move(index, by)}
            onTarget={(value) => retarget(row.topicId, value)}
            onChange={(patch) => update(row.topicId, patch)}
          />
        ))}
      </ol>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Held to the bottom of the screen while there is something to save:
          the list is long, and a teacher who has scrolled to section eleven
          should not have to scroll back to find the button. */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-2',
          dirty &&
            'sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-2 rounded-xl border border-border bg-background/95 p-2 shadow-sm backdrop-blur md:bottom-3',
        )}
      >
        <Button size="lg" onClick={save} disabled={pending || !dirty}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? t.common.saving : t.common.save}
        </Button>
        <Button variant="ghost" size="lg" onClick={reset} disabled={pending}>
          <RotateCcw className="size-4" /> {t.classes.trackReset}
        </Button>
        {dirty ? (
          <span className="text-sm text-muted-foreground">{t.classes.trackUnsaved}</span>
        ) : saved ? (
          <span className="text-sm text-muted-foreground">{t.common.saved}</span>
        ) : null}
      </div>
    </div>
  )
}

function Section({
  classId,
  row,
  index,
  last,
  open,
  defaultTarget,
  onToggle,
  onMove,
  onTarget,
  onChange,
}: {
  classId: string
  row: TrackRow
  index: number
  last: boolean
  open: boolean
  defaultTarget: number
  onToggle: () => void
  onMove: (by: -1 | 1) => void
  onTarget: (value: string) => void
  onChange: (patch: Partial<TrackRow>) => void
}) {
  const t = useT()
  const locale = useLocale()
  const panelId = useId()
  const name = t.topics[row.topic] ?? row.topic
  const quota = row.picks.length || Math.min(defaultTarget, Math.max(row.available, 1))

  return (
    <li className={cn('rounded-lg border border-border', open && 'border-primary/40')}>
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5',
          (row.available === 0 || row.skipped) && 'opacity-60',
        )}
      >
        <span className="w-5 shrink-0 text-center font-mono text-xs tabular-nums text-muted-foreground">
          {index + 1}
        </span>

        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-sm font-medium', row.skipped && 'line-through')}>
            {name}
          </span>
          <span className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
            <span>
              {row.skipped
                ? t.classes.trackSkipped
                : row.available === 0
                  ? t.classes.trackEmpty
                  : t.route.inLibrary(row.available)}
            </span>
            {!row.skipped && row.picks.length ? (
              <span className="text-primary">{t.classes.trackChosenBadge}</span>
            ) : null}
            {!row.skipped && row.due ? (
              <span>{t.classes.trackDueBadge(formatDay(row.due, locale))}</span>
            ) : null}
          </span>
        </span>

        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="hidden sm:inline">{t.classes.trackTarget}</span>
          <input
            type="number"
            min={0}
            max={Math.max(row.available, 1)}
            inputMode="numeric"
            value={row.target ?? ''}
            placeholder={String(quota)}
            disabled={row.skipped}
            onChange={(event) => onTarget(event.target.value)}
            aria-label={`${t.classes.trackTarget} — ${name}`}
            className="h-8 w-16 rounded-md border border-input bg-background px-2 text-center font-mono text-sm tabular-nums outline-none focus:border-primary disabled:opacity-50"
          />
        </label>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${t.classes.trackSettings} — ${name}`}
          className={cn(
            'rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground',
            open && 'bg-muted text-foreground',
          )}
        >
          <SlidersHorizontal className="size-4" />
        </button>

        <span className="flex shrink-0 flex-col">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label={t.classes.trackUp}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={last}
            aria-label={t.classes.trackDown}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronDown className="size-4" />
          </button>
        </span>
      </div>

      {open ? (
        <div id={panelId} className="space-y-4 border-t border-border px-3 py-3 sm:px-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={row.skipped}
              onChange={(event) => onChange({ skipped: event.target.checked })}
              className="size-4 accent-primary"
            />
            {t.classes.trackSkip}
          </label>

          {row.skipped ? null : (
            <>
              <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  {t.classes.trackDue}
                  <span className="flex items-center gap-1">
                    <input
                      type="date"
                      value={row.due ?? ''}
                      onChange={(event) => onChange({ due: event.target.value || null })}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                    {row.due ? (
                      <button
                        type="button"
                        onClick={() => onChange({ due: null })}
                        aria-label={t.classes.trackDueNone}
                        className="rounded p-1 hover:bg-muted hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : (
                      <span className="text-xs">{t.classes.trackDueNone}</span>
                    )}
                  </span>
                </label>

                <label className="grid gap-1 text-xs text-muted-foreground">
                  {t.classes.trackNoteLabel}
                  <textarea
                    value={row.note ?? ''}
                    maxLength={500}
                    rows={2}
                    placeholder={t.classes.trackNotePlaceholder}
                    onChange={(event) => onChange({ note: event.target.value || null })}
                    className="min-h-9 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>

              <Picks
                classId={classId}
                topicId={row.topicId}
                picks={row.picks}
                defaultCount={Math.min(defaultTarget, Math.max(row.available, 1))}
                onChange={(picks) => onChange({ picks })}
              />
            </>
          )}
        </div>
      ) : null}
    </li>
  )
}

/**
 * The problems a teacher chose for one section, and a search to choose more.
 *
 * The search runs on the server and returns a page at a time: algebra holds
 * 659 problems, and a teacher who wants twelve should not download them all.
 */
function Picks({
  classId,
  topicId,
  picks,
  defaultCount,
  onChange,
}: {
  classId: string
  topicId: string
  picks: TrackPick[]
  defaultCount: number
  onChange: (picks: TrackPick[]) => void
}) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<TrackPick[] | null>(null)
  const [searching, startSearch] = useTransition()

  // A short pause after typing, so a word is one request rather than five.
  useEffect(() => {
    const timer = setTimeout(() => {
      startSearch(async () => {
        const result = await findTrackTasks(classId, topicId, query)
        setFound(result.ok ? result.tasks : [])
      })
    }, 250)
    return () => clearTimeout(timer)
  }, [classId, topicId, query])

  const chosen = new Set(picks.map((pick) => pick.id))

  function shift(index: number, by: -1 | 1) {
    const next = [...picks]
    const to = index + by
    if (to < 0 || to >= next.length) return
    ;[next[index], next[to]] = [next[to]!, next[index]!]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t.classes.trackPicks}
          {picks.length ? ` · ${t.classes.trackPicksCount(picks.length)}` : ''}
        </p>
        {picks.length ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {t.classes.trackPickClear}
          </button>
        ) : null}
      </div>

      {picks.length ? (
        <ol className="grid gap-1">
          {picks.map((pick, index) => (
            <li
              key={pick.id}
              className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 text-sm"
            >
              <span className="w-5 shrink-0 text-center font-mono text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{pick.title}</span>
              <DifficultyStars level={pick.difficulty} />
              <span className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => shift(index, -1)}
                  disabled={index === 0}
                  aria-label={t.classes.trackUp}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => shift(index, 1)}
                  disabled={index === picks.length - 1}
                  aria-label={t.classes.trackDown}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(picks.filter((entry) => entry.id !== pick.id))}
                  aria-label={`${t.classes.trackPickRemove} — ${pick.title}`}
                  className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">{t.classes.trackPicksNone(defaultCount)}</p>
      )}

      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.classes.trackPickSearch}
          aria-label={t.classes.trackPickSearch}
          className="h-9 w-full rounded-md border border-input bg-background pr-8 pl-8 text-sm outline-none focus:border-primary"
        />
        {searching ? (
          <Loader2 className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </label>

      {found === null ? null : found.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t.classes.trackPickNothing}</p>
      ) : (
        <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border">
          {found.map((task) => (
            <li key={task.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate">{task.title}</span>
              <DifficultyStars level={task.difficulty} />
              <button
                type="button"
                onClick={() => onChange([...picks, task])}
                disabled={chosen.has(task.id)}
                aria-label={`${t.classes.trackPickAdd} — ${task.title}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:text-muted-foreground disabled:hover:bg-transparent"
              >
                <Plus className="size-3.5" />
                {t.classes.trackPickAdd}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
