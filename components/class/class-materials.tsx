'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, FileText, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { createClassTask, deleteClassFile, deleteClassTask } from '@/app/(app)/class/actions'
import { useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ClassMaterials } from '@/lib/supabase/class-materials'
import { cn, fieldClass } from '@/lib/utils'


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
      if (!result.ok) setError(result.error ? t(result.error) : t('The file could not be uploaded. Try again.'))
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
      // Straight to the upload route: a scan of up to 20 MB is far past what a
      // server action accepts. The route checks the class is this teacher's.
      const body = new FormData()
      body.set('class_id', classId)
      body.set('file', file)
      const sent = await fetch('/api/class-files', { method: 'POST', body })
      if (!sent.ok) {
        const payload = (await sent.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? t('The file could not be uploaded. Try again.'))
        return
      }
      router.refresh()
    } catch {
      setError(t('The file could not be uploaded. Try again.'))
    } finally {
      setUploading(false)
    }
  }

  if (!editable && empty) {
    return <p className="text-ui text-muted-foreground">{t('Your teacher has not added anything yet.')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">{t('Problems')}</h3>
          {editable && !adding ? (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus /> {t('Add a problem')}
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
              <span className="text-caption font-semibold text-muted-foreground">{t('Title')}</span>
              <input name="title" required minLength={3} maxLength={160} placeholder={t('For example: Friday homework, problem 2')} className={fieldClass} />
            </label>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="flex flex-col gap-1.5">
                <span className="text-caption font-semibold text-muted-foreground">{t('Section')}</span>
                <select name="topic_id" required className={fieldClass} defaultValue="">
                  <option value="" disabled>
                    —
                  </option>
                  {(topics ?? []).map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {t(topic.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-caption font-semibold text-muted-foreground">{t('Difficulty')}</span>
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
              <span className="text-caption font-semibold text-muted-foreground">{t('Statement')}</span>
              <Textarea name="problem" required minLength={10} maxLength={8000} className="min-h-32 text-reading" />
              <span className="text-caption text-muted-foreground">{t('Formulas between dollar signs: $v_0 = \\sqrt{2gh}$.')}</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption font-semibold text-muted-foreground">{t('Reference solution (optional)')}</span>
              <Textarea name="solution" maxLength={8000} className="min-h-24 text-reading" />
              <span className="text-caption text-muted-foreground">{t('Students never see it; the grader marks against it.')}</span>
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {pending ? t('Saving…') : t('Save problem')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                {t('Cancel')}
              </Button>
            </div>
          </form>
        ) : null}

        {materials.tasks.length === 0 ? (
          <p className="text-ui text-muted-foreground">{t('No problems of your own yet.')}</p>
        ) : (
          <ul className="divide-y divide-border rounded-sm ring-1 ring-border">
            {materials.tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/tasks/${task.id}`} prefetch className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate text-ui font-semibold">{task.title}</span>
                  {task.topic ? (
                    <span className="block truncate text-caption text-muted-foreground">
                      {t(task.topic)}
                    </span>
                  ) : null}
                </Link>
                {editable ? (
                  <form
                    action={(formData) => {
                      if (window.confirm(t('Remove this problem? Attempts at it are removed too.'))) run(() => deleteClassTask(formData))
                    }}
                  >
                    <input type="hidden" name="class_id" value={classId} />
                    <input type="hidden" name="task_id" value={task.id} />
                    <Button type="submit" variant="ghost" size="icon-sm" aria-label={t('Remove')} disabled={pending}>
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
          <h3 className="font-display text-lg font-semibold">{t('Files')}</h3>
          {editable ? (
            <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
              {uploading ? t('Uploading…') : t('Upload a file')}
            </Button>
          ) : null}
        </div>
        {editable ? <p className="-mt-1 text-caption text-muted-foreground">{t('PDF, images, Word, PowerPoint or text, up to 20 MB.')}</p> : null}
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
          <p className="text-ui text-muted-foreground">{t('No files yet.')}</p>
        ) : (
          <ul className="divide-y divide-border rounded-sm ring-1 ring-border">
            {materials.files.map((file) => (
              <li key={file.id} className="flex items-center gap-3 px-4 py-3">
                <FileText aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ui font-semibold">{file.name}</span>
                  <span className="block text-caption text-muted-foreground tabular-nums">{size(file.size)}</span>
                </span>
                {/* The route reads the row as the person asking; anyone outside
                    the class gets a 404. A plain link, so it downloads. */}
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <a href={`/api/class-files/${file.id}`} download>
                      <Download /> {t('Download')}
                    </a>
                  }
                />
                {editable ? (
                  <form
                    action={(formData) => {
                      if (window.confirm(t('Remove this file?'))) run(() => deleteClassFile(formData))
                    }}
                  >
                    <input type="hidden" name="class_id" value={classId} />
                    <input type="hidden" name="file_id" value={file.id} />
                    <Button type="submit" variant="ghost" size="icon-sm" aria-label={t('Remove')} disabled={pending}>
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
