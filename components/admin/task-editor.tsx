'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Save, Trash2 } from 'lucide-react'
import { deleteTask, saveTask, setTaskHidden } from '@/app/(app)/admin/tasks/actions'
import { MathText } from '@/components/math-text'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import { cardClass, cn, fieldClass } from '@/lib/utils'

export type EditableTask = {
  id: string
  title: string
  problem: string
  official_solution: string | null
  hints: string[]
  difficulty: number
  topic_id: string
  grade_min: number | null
  grade_max: number | null
  level: string | null
  estimated_minutes: number | null
  source: string | null
  paper: string | null
  hidden: boolean
}

const inputClass = cn(fieldClass, 'mt-1.5 h-10')
const areaClass = cn(fieldClass, 'mt-1.5 h-auto min-h-28 py-2.5 font-mono text-[13px] leading-6')

/**
 * The statement and the reference solution side by side with how they will
 * render, so a broken formula is seen here and not by a student.
 */
export function TaskEditor({
  task,
  topics,
  attempts,
}: {
  task: EditableTask | null
  topics: { id: string; label: string; group: string }[]
  attempts: number
}) {
  const t = useT()
  const router = useRouter()
  const [problem, setProblem] = useState(task?.problem ?? '')
  const [solution, setSolution] = useState(task?.official_solution ?? '')
  const [preview, setPreview] = useState<'problem' | 'solution'>('problem')
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const groups = [...new Set(topics.map((topic) => topic.group))]

  function submit(formData: FormData) {
    setNotice(null)
    startTransition(async () => {
      const result = await saveTask(task?.id ?? null, formData)
      setNotice({ ok: result.ok, text: (result.ok ? result.message : result.error) ?? '' })
      if (result.ok && !task && result.id) router.push(`/admin/tasks/${result.id}`)
      else if (result.ok) router.refresh()
    })
  }

  function toggleHidden() {
    if (!task) return
    startTransition(async () => {
      const result = await setTaskHidden(task.id, !task.hidden)
      setNotice({ ok: result.ok, text: (result.ok ? result.message : result.error) ?? '' })
      router.refresh()
    })
  }

  function remove() {
    if (!task || !window.confirm(t('Delete this problem for good?'))) return
    startTransition(async () => {
      const result = await deleteTask(task.id)
      if (result.ok) router.push('/admin/tasks')
      else setNotice({ ok: false, text: result.error ?? '' })
    })
  }

  return (
    <form action={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className={cn(cardClass, 'space-y-4 p-5 sm:p-6')}>
        <label className="block text-sm text-ash">
          {t('Title')}
          <input name="title" required maxLength={300} defaultValue={task?.title ?? ''} className={inputClass} />
        </label>
        <label className="block text-sm text-ash">
          {t('Statement')}
          <textarea
            name="problem"
            required
            value={problem}
            onChange={(event) => setProblem(event.target.value)}
            onFocus={() => setPreview('problem')}
            rows={10}
            className={areaClass}
          />
          <span className="mt-1 block text-[11px] text-smoke">{t('Formulas in \\( … \\) inline and \\[ … \\] on their own line. A blank line starts a paragraph.')}</span>
        </label>
        <label className="block text-sm text-ash">
          {t('Reference solution')}
          <textarea
            name="official_solution"
            value={solution}
            onChange={(event) => setSolution(event.target.value)}
            onFocus={() => setPreview('solution')}
            rows={8}
            className={areaClass}
          />
          <span className="mt-1 block text-[11px] text-smoke">{t('Students never see it. The grader checks answers against it.')}</span>
        </label>
        <label className="block text-sm text-ash">
          {t('Hints, one per line')}
          <textarea name="hints" rows={3} defaultValue={(task?.hints ?? []).join('\n')} className={cn(areaClass, 'min-h-20')} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 block text-sm text-ash">
            {t('Topic')}
            <select name="topic_id" required defaultValue={task?.topic_id ?? ''} className={inputClass}>
              <option value="" disabled>
                {t('Choose a topic')}
              </option>
              {groups.map((group) => (
                <optgroup key={group} label={group}>
                  {topics
                    .filter((topic) => topic.group === group)
                    .map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block text-sm text-ash">
            {t('Difficulty')}
            <select name="difficulty" defaultValue={String(task?.difficulty ?? 3)} className={inputClass}>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {'★'.repeat(value)} {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-ash">
            {t('Stage')}
            <select name="level" defaultValue={task?.level ?? ''} className={inputClass}>
              <option value="">—</option>
              <option value="oblast">{t('Oblast')}</option>
              <option value="republican">{t('Republican')}</option>
              <option value="international">{t('International')}</option>
            </select>
          </label>
          <label className="block text-sm text-ash">
            {t('From grade')}
            <input name="grade_min" inputMode="numeric" maxLength={2} defaultValue={task?.grade_min ?? ''} className={inputClass} />
          </label>
          <label className="block text-sm text-ash">
            {t('To grade')}
            <input name="grade_max" inputMode="numeric" maxLength={2} defaultValue={task?.grade_max ?? ''} className={inputClass} />
          </label>
          <label className="block text-sm text-ash">
            {t('Minutes')}
            <input name="estimated_minutes" inputMode="numeric" maxLength={3} defaultValue={task?.estimated_minutes ?? ''} className={inputClass} />
          </label>
          <label className="block text-sm text-ash">
            {t('Paper')}
            <input name="paper" maxLength={80} defaultValue={task?.paper ?? ''} placeholder="oblast-2024-9" className={inputClass} />
          </label>
          <label className="col-span-2 block text-sm text-ash">
            {t('Source')}
            <input name="source" maxLength={200} defaultValue={task?.source ?? ''} className={inputClass} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-ash">
          <input type="checkbox" name="hidden" defaultChecked={task?.hidden ?? false} className="size-4 accent-coral" />
          {t('Hidden from students')}
        </label>

        {notice?.text ? (
          <p role="status" className={cn('text-sm', notice.ok ? 'text-success' : 'text-coral')}>
            {notice.text}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {task ? t('Save changes') : t('Create problem')}
          </Button>
          {task ? (
            <Button type="button" variant="outline" disabled={pending} onClick={toggleHidden}>
              {task.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              {task.hidden ? t('Show to students') : t('Hide from students')}
            </Button>
          ) : null}
          {task ? (
            <Button
              type="button"
              variant="destructive"
              disabled={pending || attempts > 0}
              title={attempts > 0 ? t('Students have attempted this problem. Hide it instead.') : undefined}
              onClick={remove}
            >
              <Trash2 className="size-4" /> {t('Delete')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className={cn(cardClass, 'p-5 sm:p-6 lg:sticky lg:top-20')}>
        <div className="flex gap-1 rounded-lg bg-foreground/[0.03] p-1">
          {(['problem', 'solution'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPreview(value)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-[13px] transition-colors',
                preview === value ? 'bg-foreground/[0.08] text-foreground' : 'text-ash hover:text-foreground',
              )}
            >
              {value === 'problem' ? t('Statement preview') : t('Solution preview')}
            </button>
          ))}
        </div>
        <div className="mt-4 max-h-[70vh] overflow-y-auto text-[15px] text-foreground">
          {(preview === 'problem' ? problem : solution).trim() ? (
            <MathText text={preview === 'problem' ? problem : solution} />
          ) : (
            <p className="text-sm text-smoke">{t('Nothing written yet.')}</p>
          )}
        </div>
      </div>
    </form>
  )
}
