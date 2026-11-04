'use client'

import { useRef, useState, useTransition } from 'react'
import { Eye, EyeOff, ExternalLink, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import {
  addCompetition,
  removeCompetition,
  setCompetitionActive,
  updateCompetition,
} from '@/app/(app)/admin/actions'
import { Button } from '@/components/ui/button'
import { cardClass, cn, fieldClass } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'

type Detail = { summary: string; format: string | null; route: string | null; eligibility: string | null }

export type AdminCompetition = {
  id: string
  slug: string | null
  name: string
  subject_id: string | null
  subject: string | null
  level: string | null
  region: string | null
  founded: number | null
  official_url: string | null
  papers_url: string | null
  starts_on: string | null
  ends_on: string | null
  registration_deadline: string | null
  registration_url: string | null
  active: boolean
  registered: number
  details: Partial<Record<'ru' | 'kk' | 'en', Detail>>
}

const inputClass = cn(fieldClass, 'mt-2 h-10')
const LOCALES = ['ru', 'kk', 'en'] as const

function range(start: string | null, end: string | null) {
  if (!start) return null
  return end && end !== start ? `${start} → ${end}` : start
}

/**
 * The olympiad catalogue: the list, and one form that adds a new olympiad or
 * edits the one picked from the list. Editing keeps the page address
 * (the slug), so links students saved keep working.
 */
export function CompetitionAdmin({
  subjects,
  competitions,
}: {
  subjects: { id: string; name: string }[]
  competitions: AdminCompetition[]
}) {
  const t = useT()

  const formRef = useRef<HTMLFormElement>(null)
  const [editing, setEditing] = useState<AdminCompetition | null>(null)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  function submit(formData: FormData) {
    setNotice(null)
    startTransition(async () => {
      const result = editing ? await updateCompetition(editing.id, formData) : await addCompetition(formData)
      if (result.ok) {
        setNotice({ tone: 'ok', text: result.message ?? t('Saved.') })
        // React resets a submitted form to its defaults, which for an edit are
        // the values from before the save. Leave edit mode instead; the list
        // already shows the saved olympiad.
        if (editing) setEditing(null)
        else formRef.current?.reset()
      } else {
        setNotice({ tone: 'error', text: result.error ?? t('That did not save.') })
      }
    })
  }

  function edit(competition: AdminCompetition) {
    setNotice(null)
    setEditing(competition)
    // The form is keyed by the olympiad, so its fields remount with its values.
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function remove(competition: AdminCompetition) {
    const warning = competition.registered
      ? t('Remove “{name}”? {registered} student(s) registered for it will lose it from their list.', { name: competition.name, registered: competition.registered })
      : t('Remove “{name}”?', { name: competition.name })
    if (!window.confirm(warning)) return
    setBusy(competition.id)
    startTransition(async () => {
      const result = await removeCompetition(competition.id)
      if (!result.ok) setNotice({ tone: 'error', text: result.error ?? t('That could not be removed.') })
      if (editing?.id === competition.id) setEditing(null)
      setBusy(null)
    })
  }

  function toggle(competition: AdminCompetition) {
    setBusy(competition.id)
    startTransition(async () => {
      const result = await setCompetitionActive(competition.id, !competition.active)
      setNotice({ tone: result.ok ? 'ok' : 'error', text: (result.ok ? result.message : result.error) ?? '' })
      setBusy(null)
    })
  }

  const needle = query.trim().toLowerCase()
  const listed = competitions.filter(
    (competition) => !needle || [competition.name, competition.region, competition.level].some((value) => value?.toLowerCase().includes(needle)),
  )
  const today = new Date().toISOString().slice(0, 10)
  const value = editing

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <section className={cn(cardClass, 'overflow-hidden')}>
        {competitions.length > 5 ? (
          <div className="border-b border-foreground/[0.06] p-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Search olympiads')}
              className={cn(fieldClass, 'h-9')}
            />
          </div>
        ) : null}
        {listed.length ? (
          <ul className="divide-y divide-foreground/[0.06]">
            {listed.map((competition) => {
              const over = (competition.ends_on ?? competition.starts_on ?? '9999') < today
              return (
                <li
                  key={competition.id}
                  className={cn('flex items-start gap-2 px-5 py-4', editing?.id === competition.id && 'bg-foreground/[0.03]')}
                >
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', competition.active ? 'text-foreground' : 'text-smoke line-through')}>
                      {competition.name}
                    </p>
                    <p className="mt-1 text-xs text-ash">
                      {[competition.subject ?? t('Any subject'), competition.level, competition.region].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-2 font-mono text-[11px] text-smoke">
                      {range(competition.starts_on, competition.ends_on) ?? t('Date not announced')}
                      {competition.registration_deadline ? t(' · register by {registration_deadline}', { registration_deadline: competition.registration_deadline }) : ''}
                      {t(' · {registered} registered', { registered: competition.registered })}
                      {' · '}
                      {LOCALES.filter((locale) => competition.details[locale]).map((locale) => locale.toUpperCase()).join('/') || t('no write-up')}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1">
                      {!competition.active ? (
                        <span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-[11px] text-warning">{t('hidden')}</span>
                      ) : null}
                      {over ? <span className="rounded-md bg-foreground/[0.05] px-1.5 py-0.5 text-[11px] text-smoke">{t('over')}</span> : null}
                    </p>
                  </div>
                  {competition.slug && competition.active ? (
                    <a
                      href={`/olympiads/${competition.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t('Open the page students see')}
                      className="rounded-lg p-2 text-smoke transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => edit(competition)}
                    aria-label={t('Edit {name}', { name: competition.name })}
                    className="rounded-lg p-2 text-smoke transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(competition)}
                    disabled={pending}
                    aria-label={competition.active ? t('Hide from students') : t('Show to students')}
                    title={competition.active ? t('Hide from students') : t('Show to students')}
                    className="rounded-lg p-2 text-smoke transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-50"
                  >
                    {busy === competition.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : competition.active ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(competition)}
                    disabled={pending}
                    aria-label={t('Remove {name}', { name: competition.name })}
                    className="rounded-lg p-2 text-smoke transition-colors hover:bg-coral/10 hover:text-coral disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="p-6 text-sm text-ash">
            {competitions.length ? t('Nothing matches that search.') : t('No olympiads listed yet. Add the first one on the right.')}
          </p>
        )}
      </section>

      <form
        key={editing?.id ?? 'new'}
        ref={formRef}
        action={submit}
        className={cn(cardClass, 'scroll-mt-20 space-y-4 p-5 sm:p-6', editing && 'ring-1 ring-foreground/20')}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-medium text-foreground">
            {editing ? t('Edit “{name}”', { name: editing.name }) : t('Add an olympiad')}
          </h2>
          {editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setNotice(null)
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-ash hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <X className="size-3.5" /> {t('Cancel')}
            </button>
          ) : null}
        </div>
        <label className="block text-sm text-ash">
          {t('Name')}
          <input name="name" required maxLength={160} defaultValue={value?.name ?? ''} className={inputClass} placeholder={t('IPhO 2027')} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-ash">
            {t('Subject')}
            <select name="subject_id" defaultValue={value?.subject_id ?? ''} className={inputClass}>
              <option value="">{t('Any')}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-ash">
            {t('Level')}
            <input name="level" maxLength={60} defaultValue={value?.level ?? ''} className={inputClass} placeholder={t('International')} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-ash">
            {t('Starts')}
            <input type="date" name="starts_on" defaultValue={value?.starts_on ?? ''} className={inputClass} />
          </label>
          <label className="block text-sm text-ash">
            {t('Ends')}
            <input type="date" name="ends_on" defaultValue={value?.ends_on ?? ''} className={inputClass} />
          </label>
        </div>
        <label className="block text-sm text-ash">
          {t('Registration deadline')}
          <input type="date" name="registration_deadline" defaultValue={value?.registration_deadline ?? ''} className={inputClass} />
        </label>
        <label className="block text-sm text-ash">
          {t('Registration link')}
          <input type="url" name="registration_url" defaultValue={value?.registration_url ?? ''} className={inputClass} placeholder="https://" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-ash">
            {t('Region')}
            <input name="region" maxLength={80} defaultValue={value?.region ?? ''} className={inputClass} placeholder={t('Kazakhstan')} />
          </label>
          <label className="block text-sm text-ash">
            {t('Founded')}
            <input name="founded" inputMode="numeric" maxLength={4} defaultValue={value?.founded ?? ''} className={inputClass} placeholder="1967" />
          </label>
        </div>
        <label className="block text-sm text-ash">
          {t('Official site')}
          <input type="url" name="official_url" defaultValue={value?.official_url ?? ''} className={inputClass} placeholder="https://" />
        </label>
        <label className="block text-sm text-ash">
          {t('Past papers link')}
          <input type="url" name="papers_url" defaultValue={value?.papers_url ?? ''} className={inputClass} placeholder="https://" />
        </label>
        {/* The write-up the olympiad's own page shows, per language. A
            language without a summary simply has no prose there. */}
        {LOCALES.map((locale) => (
          <details key={locale} open={Boolean(value?.details[locale])} className="rounded-lg bg-foreground/[0.03] p-3 ring-1 ring-foreground/[0.06]">
            <summary className="cursor-pointer text-sm text-ash">
              {t('Description')} · {locale.toUpperCase()}
              {value?.details[locale] ? <span className="ml-2 text-success">●</span> : null}
            </summary>
            <div className="mt-3 space-y-3">
              {(
                [
                  ['summary', 'What it is'],
                  ['format', 'The papers'],
                  ['eligibility', 'Who can enter'],
                  ['route', 'How you get there'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm text-ash">
                  {t(label)}
                  <textarea
                    name={`${key}_${locale}`}
                    rows={2}
                    maxLength={2000}
                    defaultValue={value?.details[locale]?.[key] ?? ''}
                    className={cn(fieldClass, 'mt-2 h-auto py-2')}
                  />
                </label>
              ))}
            </div>
          </details>
        ))}
        <label className="flex items-center gap-2 text-sm text-ash">
          <input type="checkbox" name="visible" defaultChecked={value?.active ?? true} className="size-4 accent-coral" />
          {t('Visible to students')}
        </label>
        {notice ? (
          <p className={cn('text-sm', notice.tone === 'ok' ? 'text-success' : 'text-coral')}>{notice.text}</p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending && !busy ? <Loader2 className="size-4 animate-spin" /> : editing ? <Save className="size-4" /> : <Plus className="size-4" />}
          {editing ? t('Save changes') : t('Add olympiad')}
        </Button>
      </form>
    </div>
  )
}
