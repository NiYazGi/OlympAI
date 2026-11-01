'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, FileText, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import {
  classFileLink,
  createClassTask,
  deleteClassFile,
  deleteClassTask,
  prepareClassFile,
  recordClassFile,
} from '@/app/(app)/class/actions'
import { useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ClassMaterials } from '@/lib/supabase/class-materials'
import { cn } from '@/lib/utils'

const fieldClass =
  'w-full rounded-sm border border-input bg-background px-3 py-2 text-ui outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** "2.4 MB", "380 KB": the size a person checks before downloading on a phone. */
function size(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/**
 * A class's own problems and files.
 *
 * The teacher writes problems and uploads files here; students see the same
 * lists without the controls. A problem opens on the ordinary problem page and
 * is graded line by line like any other, against the teacher's reference
 * solution when one was given.
 */
export function ClassMaterialsPanel({
  classId,
  materials,
  topics,
  editable,
}: {
  classId: string
  materials: ClassMaterials
  /** Sections a problem may be filed under; only the teacher needs them. */
  topics?: { id: string; name: string }[]
  editable: boolean
}) {
  const t = useT()
  const m = t.classMaterials
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const empty = materials.tasks.length === 0 && materials.files.length === 0

  function run(action: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError('')
    start(async () => {
      const result = await action()
      if (!result.ok) setError(result.error ?? m.uploadFailed)
      else {
        after?.()
        router.refresh()
      }
    })
  }

  async function upload(file: File | undefined) {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const mime = file.type || 'application/octet-stream'
      const prepared = await prepareClassFile(classId, file.name, file.size, mime)
      if (!prepared.ok) {
        setError(prepared.error)
        return
      }
      const sent = await fetch(prepared.url, { method: 'PUT', body: file, headers: { 'content-type': mime } })
      if (!sent.ok) {
        setError(m.uploadFailed)
        return
      }
      const recorded = await recordClassFile(classId, prepared.path, file.name, file.size, mime)
      if (!recorded.ok) setError(recorded.error ?? m.uploadFailed)
      else router.refresh()
    } catch {
      setError(m.uploadFailed)
    } finally {
      setUploading(false)
    }
  }

  async function open(fileId: string) {
    const link = await classFileLink(fileId)
    if (link.ok) window.location.assign(link.url)
    else setError(m.linkFailed)
  }

  if (!editable && empty) {
    return <p className="text-ui text-muted-foreground">{m.studentEmpty}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">{m.problems}</h3>
          {editable && !adding ? (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus /> {m.addProblem}
            </Button>
          ) : null}
        </div>

        {editable && adding ? (
          <form
            className="flex flex-col gap-4 rounded-sm bg-muted p-4 ring-1 ring-border"
            action={(formData) => run(() => createClassTask(formData), () => setAdding(false))}
          >
            <input type="hidden" name="class_id" value={classId} />
            <label className="flex flex-col gap-1.5">
              <span className="text-caption font-semibold text-muted-foreground">{m.titleLabel}</span>
              <input name="title" required minLength={3} maxLength={160} placeholder={m.titlePlaceholder} className={fieldClass} />
            </label>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="flex flex-col gap-1.5">
                <span className="text-caption font-semibold text-muted-foreground">{m.topicLabel}</span>
                <select name="topic_id" required className={fieldClass} defaultValue="">
                  <option value="" disabled>
                    —
                  </option>
                  {(topics ?? []).map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {t.topics[topic.name] ?? topic.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-caption font-semibold text-muted-foreground">{m.difficultyLabel}</span>
                <select name="difficulty" defaultValue="3" className={fieldClass}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption font-semibold text-muted-foreground">{m.problemLabel}</span>
              <Textarea name="problem" required minLength={10} maxLength={8000} className="min-h-32 text-reading" />
              <span className="text-caption text-muted-foreground">{m.problemHint}</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption font-semibold text-muted-foreground">{m.solutionLabel}</span>
              <Textarea name="solution" maxLength={8000} className="min-h-24 text-reading" />
              <span className="text-caption text-muted-foreground">{m.solutionHint}</span>
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {pending ? m.saving : m.save}
              </Button>
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                {m.cancel}
              </Button>
            </div>
          </form>
        ) : null}

        {materials.tasks.length === 0 ? (
          <p className="text-ui text-muted-foreground">{m.noProblems}</p>
        ) : (
          <ul className="divide-y divide-border rounded-sm ring-1 ring-border">
            {materials.tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/tasks/${task.id}`} prefetch className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate text-ui font-semibold">{task.title}</span>
                  {task.topic ? (
                    <span className="block truncate text-caption text-muted-foreground">
                      {t.topics[task.topic] ?? task.topic}
                    </span>
                  ) : null}
                </Link>
                {editable ? (
                  <form
                    action={(formData) => {
                      if (window.confirm(m.confirmRemoveProblem)) run(() => deleteClassTask(formData))
                    }}
                  >
                    <input type="hidden" name="class_id" value={classId} />
                    <input type="hidden" name="task_id" value={task.id} />
                    <Button type="submit" variant="ghost" size="icon-sm" aria-label={m.remove} disabled={pending}>
                      <Trash2 />
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">{m.files}</h3>
          {editable ? (
            <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
              {uploading ? m.uploading : m.upload}
            </Button>
          ) : null}
        </div>
        {editable ? <p className="-mt-1 text-caption text-muted-foreground">{m.uploadHint}</p> : null}
        {editable ? (
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            tabIndex={-1}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx,.ppt,.pptx"
            onChange={(event) => {
              void upload(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        ) : null}

        {materials.files.length === 0 ? (
          <p className="text-ui text-muted-foreground">{m.noFiles}</p>
        ) : (
          <ul className="divide-y divide-border rounded-sm ring-1 ring-border">
            {materials.files.map((file) => (
              <li key={file.id} className="flex items-center gap-3 px-4 py-3">
                <FileText aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ui font-semibold">{file.name}</span>
                  <span className="block text-caption text-muted-foreground tabular-nums">{size(file.size)}</span>
                </span>
                <Button variant="outline" size="sm" onClick={() => void open(file.id)}>
                  <Download /> {m.download}
                </Button>
                {editable ? (
                  <form
                    action={(formData) => {
                      if (window.confirm(m.confirmRemoveFile)) run(() => deleteClassFile(formData))
                    }}
                  >
                    <input type="hidden" name="class_id" value={classId} />
                    <input type="hidden" name="file_id" value={file.id} />
                    <Button type="submit" variant="ghost" size="icon-sm" aria-label={m.remove} disabled={pending}>
                      <Trash2 />
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p role="alert" className={cn('text-ui font-semibold text-destructive')}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
