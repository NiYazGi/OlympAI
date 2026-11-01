'use client'

import { useState, useTransition } from 'react'
import { BookOpen, Link2, Loader2, Plus, Trash2, Video } from 'lucide-react'
import { addMaterial, removeMaterial } from '@/app/(app)/settings/material/actions'
import { YouTubeEmbed } from '@/components/resources/youtube-embed'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { LICENCES, licenceInfo, youTubeId, type Licence } from '@/lib/licence'
import { cardClass, cn } from '@/lib/utils'

type Option = { id: string; label: string; group: string }
export type ExistingResource = {
  id: string
  kind: string
  title: string
  url: string
  licence: Licence
  attachedTo: string
}

const KINDS = [
  { value: 'video', label: 'Lecture', icon: Video, hint: 'YouTube only' },
  { value: 'reading', label: 'Reading', icon: BookOpen, hint: 'A chapter or article' },
  { value: 'reference', label: 'Reference', icon: Link2, hint: 'Anything else' },
] as const

// 'unknown' is deliberately absent: it is the one value the form must not be
// able to submit, and the database rejects it besides.
const LICENCE_CHOICES = (Object.keys(LICENCES) as Licence[]).filter((key) => key !== 'unknown')

const inputClass =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary'

export function MaterialForm({
  tasks,
  topics,
  existing,
}: {
  tasks: Option[]
  topics: Option[]
  existing: ExistingResource[]
}) {
  const [kind, setKind] = useState<(typeof KINDS)[number]['value']>('video')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [licence, setLicence] = useState<Licence>('cc-by')
  const [attachTo, setAttachTo] = useState<'task' | 'topic'>('task')
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const info = licenceInfo(licence)
  const videoId = kind === 'video' ? youTubeId(url) : null

  function submit(formData: FormData) {
    setNotice(null)
    startTransition(async () => {
      try {
        const result = await addMaterial(formData)
        if (result.ok) {
          setNotice({ tone: 'ok', text: result.message ?? 'Added.' })
          setUrl('')
          setTitle('')
        } else {
          setNotice({ tone: 'error', text: result.error ?? 'That did not save.' })
        }
      } catch {
        setNotice({
          tone: 'error',
          text: 'That did not save. Check your connection and try again.',
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      <form action={submit} className={cn(cardClass, 'space-y-5 p-5 sm:p-6')}>
        <fieldset>
          <legend className="text-caption font-semibold text-muted-foreground">
            Kind
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {KINDS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors',
                  kind === option.value
                    ? 'border-primary bg-accent/60'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={option.value}
                  checked={kind === option.value}
                  onChange={() => setKind(option.value)}
                  className="sr-only"
                />
                <option.icon className="size-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-caption font-semibold text-muted-foreground">
            Link
          </span>
          <Input
            name="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
            placeholder={kind === 'video' ? 'https://youtube.com/watch?v=…' : 'https://…'}
            className="mt-2"
          />
          {kind === 'video' && url && !videoId ? (
            <span className="mt-1.5 block text-xs text-warning">
              Not a YouTube link. Add it as a reference instead, or paste a YouTube URL.
            </span>
          ) : null}
        </label>

        {videoId ? (
          <div>
            <p className="mb-2 text-caption font-semibold text-muted-foreground">
              Preview
            </p>
            {/* The same component students see, so what is checked is what ships. */}
            <YouTubeEmbed url={url} title={title || 'Untitled lecture'} />
          </div>
        ) : null}

        <label className="block">
          <span className="text-caption font-semibold text-muted-foreground">
            Title
          </span>
          <Input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={200}
            placeholder="Binary search, lecture 3"
            className="mt-2"
          />
        </label>

        <label className="block">
          <span className="text-caption font-semibold text-muted-foreground">
            Description <span className="font-normal normal-case">(optional)</span>
          </span>
          <Textarea
            name="description"
            maxLength={500}
            rows={2}
            placeholder="What a student gets out of it."
            className="mt-2 resize-y"
          />
        </label>

        <fieldset>
          <legend className="text-caption font-semibold text-muted-foreground">
            Attach to
          </legend>
          <div className="mt-3 flex gap-2">
            {(['task', 'topic'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAttachTo(value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  attachTo === value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary/40',
                )}
              >
                {value === 'task' ? 'One task' : 'A whole topic'}
              </button>
            ))}
          </div>
          <select
            key={attachTo}
            name={attachTo === 'task' ? 'task_id' : 'topic_id'}
            required
            defaultValue=""
            className={cn(inputClass, 'mt-3')}
          >
            <option value="" disabled>
              {attachTo === 'task' ? 'Choose a task…' : 'Choose a topic…'}
            </option>
            {(attachTo === 'task' ? tasks : topics).map((option) => (
              <option key={option.id} value={option.id}>
                {option.group} · {option.label}
              </option>
            ))}
          </select>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-caption font-semibold text-muted-foreground">
              Licence
            </span>
            <select
              name="licence"
              value={licence}
              onChange={(event) => setLicence(event.target.value as Licence)}
              className={cn(inputClass, 'mt-2')}
            >
              {LICENCE_CHOICES.map((key) => (
                <option key={key} value={key}>
                  {LICENCES[key].label}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-xs text-muted-foreground">{info.note}</span>
          </label>

          <label className="block">
            <span className="text-caption font-semibold text-muted-foreground">
              Credit{' '}
              {info.requiresAttribution ? (
                <span className="text-primary">· required</span>
              ) : (
                <span className="font-normal normal-case">(optional)</span>
              )}
            </span>
            <Input
              name="attribution"
              maxLength={200}
              required={info.requiresAttribution}
              placeholder="MIT OpenCourseWare"
              className="mt-2"
            />
          </label>
        </div>

        {notice ? (
          <p
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'rounded-lg p-3 text-sm',
              notice.tone === 'error'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-success/10 text-success',
            )}
          >
            {notice.text}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Plus className="size-4" /> Add material
            </>
          )}
        </Button>
      </form>

      {existing.length ? (
        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <h2 className="font-semibold">Already added</h2>
          <ul className="mt-4 divide-y divide-border">
            {existing.map((resource) => (
              <ExistingRow key={resource.id} resource={resource} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function ExistingRow({ resource }: { resource: ExistingResource }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{resource.title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {resource.attachedTo} · {licenceInfo(resource.licence).label}
        </span>
        {error ? <span className="block text-xs text-destructive">{error}</span> : null}
      </span>
      <button
        type="button"
        aria-label={`Remove ${resource.title}`}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const result = await removeMaterial(resource.id)
              if (!result.ok) setError(result.error ?? 'Could not remove.')
            } catch {
              setError('Could not remove. Check your connection and try again.')
            }
          })
        }
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </button>
    </li>
  )
}
