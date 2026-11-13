'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Heart, Loader2, Lock, Pencil, Pin, Send, Trash2 } from 'lucide-react'
import { edit, giveAward, like, markSolution, moderate, newThread, remove, reply, saveBio, type ForumResult } from '@/app/(app)/forum/actions'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import { AWARDS } from '@/lib/awards'
import { cn, fieldClass } from '@/lib/utils'

function useRun() {
  const t = useT()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const run = (action: () => Promise<ForumResult>, after?: (result: Extract<ForumResult, { ok: true }>) => void) => {
    setError('')
    start(async () => {
      try {
        const result = await action()
        if (!result.ok) setError(result.error)
        else after?.(result)
      } catch {
        setError(t('That did not save. Check your connection and try again.'))
      }
    })
  }
  return { pending, error, run }
}

const HELP = 'Formulas in $…$, code between ``` lines. A blank line starts a paragraph.'

export function NewThreadForm({ categories, initialCategory, taskId, taskTitle }: { categories: { slug: string; name: string }[]; initialCategory: string; taskId: string | null; taskTitle: string | null }) {
  const t = useT()
  const router = useRouter()
  const [category, setCategory] = useState(initialCategory)
  const [title, setTitle] = useState(taskTitle ? `${t('Discussion')}: ${taskTitle}`.slice(0, 160) : '')
  const [body, setBody] = useState('')
  const { pending, error, run } = useRun()
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        run(() => newThread({ category, title, body, taskId }), (result) => router.push(`/forum/t/${result.id}`))
      }}
    >
      <label className="block text-sm">
        <span className="mb-1 block font-medium">{t('Section')}</span>
        <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((entry) => (
            <option key={entry.slug} value={entry.slug}>{t(entry.name)}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">{t('Title')}</span>
        <input className={fieldClass} value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} required minLength={3} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">{t('Message')}</span>
        <textarea className={cn(fieldClass, 'min-h-48 py-2')} value={body} maxLength={20000} onChange={(event) => setBody(event.target.value)} required />
        <span className="mt-1 block text-xs text-muted-foreground">{t(HELP)}</span>
      </label>
      {taskTitle ? <p className="text-sm text-muted-foreground">{t('Linked problem')}: {taskTitle}</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {t('Publish')}
      </Button>
    </form>
  )
}

export function ReplyForm({ threadId }: { threadId: string }) {
  const t = useT()
  const router = useRouter()
  const [body, setBody] = useState('')
  const { pending, error, run } = useRun()
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        run(() => reply(threadId, body), () => {
          setBody('')
          router.refresh()
        })
      }}
    >
      <textarea
        className={cn(fieldClass, 'min-h-28 py-2')}
        placeholder={t('Your reply')}
        value={body}
        maxLength={20000}
        onChange={(event) => setBody(event.target.value)}
        required
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{t(HELP)}</span>
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {t('Reply')}
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </form>
  )
}

export function LikeButton({ threadId, postId, count, liked }: { threadId: string; postId: string | null; count: number; liked: boolean }) {
  const t = useT()
  const [state, setState] = useState({ count, liked })
  const { pending, run } = useRun()
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={state.liked}
      aria-label={t('Like')}
      onClick={() => run(() => like(threadId, postId), (result) => setState((s) => ({ liked: Boolean(result.liked), count: s.count + (result.liked ? 1 : -1) })))}
      className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-foreground/[0.06]', state.liked ? 'text-coral' : 'text-muted-foreground')}
    >
      <Heart className={cn('size-3.5', state.liked && 'fill-current')} /> <span className="tabular-nums">{state.count}</span>
    </button>
  )
}

/** Edit, delete and, for the thread's author, "this solved it". */
export function PostActions({
  kind, id, threadId, canEdit, canMarkSolution, isSolution, body, title,
}: { kind: 'thread' | 'post'; id: string; threadId: string; canEdit: boolean; canMarkSolution: boolean; isSolution?: boolean; body: string; title?: string }) {
  const t = useT()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(body)
  const [draftTitle, setDraftTitle] = useState(title ?? '')
  const { pending, error, run } = useRun()
  if (editing) {
    return (
      <div className="mt-3 w-full space-y-2">
        {kind === 'thread' ? <input className={fieldClass} value={draftTitle} maxLength={160} onChange={(event) => setDraftTitle(event.target.value)} /> : null}
        <textarea className={cn(fieldClass, 'min-h-32 py-2')} value={draft} maxLength={20000} onChange={(event) => setDraft(event.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" disabled={pending} onClick={() => run(() => edit(kind, id, { title: draftTitle, body: draft }), () => { setEditing(false); router.refresh() })}>{t('Save')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t('Cancel')}</Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    )
  }
  return (
    <>
      {canMarkSolution && kind === 'post' ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => markSolution(threadId, isSolution ? null : id), () => router.refresh())}
          className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-foreground/[0.06]', isSolution ? 'text-success' : 'text-muted-foreground')}
        >
          <CheckCircle2 className="size-3.5" /> {isSolution ? t('Unmark solution') : t('Mark as solution')}
        </button>
      ) : null}
      {canEdit ? (
        <>
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-foreground/[0.06]">
            <Pencil className="size-3.5" /> {t('Edit')}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => window.confirm(t('Delete this post?')) && run(() => remove(kind, id), () => (kind === 'thread' ? router.push('/forum') : router.refresh()))}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-foreground/[0.06] hover:text-destructive"
          >
            <Trash2 className="size-3.5" /> {t('Delete')}
          </button>
        </>
      ) : null}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </>
  )
}

export function ModerationBar({ threadId, pinned, locked }: { threadId: string; pinned: boolean; locked: boolean }) {
  const t = useT()
  const router = useRouter()
  const { pending, run } = useRun()
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => moderate(threadId, { pinned: !pinned }), () => router.refresh())}>
        <Pin className="size-3.5" /> {pinned ? t('Unpin') : t('Pin')}
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => moderate(threadId, { locked: !locked }), () => router.refresh())}>
        <Lock className="size-3.5" /> {locked ? t('Reopen') : t('Close for replies')}
      </Button>
    </div>
  )
}

export function BioEditor({ initial }: { initial: string }) {
  const t = useT()
  const router = useRouter()
  const [bio, setBio] = useState(initial)
  const [open, setOpen] = useState(false)
  const { pending, error, run } = useRun()
  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" /> {initial ? t('Edit about me') : t('Add a line about yourself')}
      </Button>
    )
  }
  return (
    <div className="w-full max-w-md space-y-2">
      <textarea className={cn(fieldClass, 'min-h-20 py-2')} maxLength={300} value={bio} onChange={(event) => setBio(event.target.value)} placeholder={t('School, olympiads, what you are preparing for…')} />
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => saveBio(bio), () => { setOpen(false); router.refresh() })}>{t('Save')}</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

export function AwardGiver({ userId, held }: { userId: string; held: string[] }) {
  const t = useT()
  const router = useRouter()
  const manual = AWARDS.filter((award) => award.kind === 'manual')
  const [award, setAward] = useState(manual[0]?.id ?? '')
  const [note, setNote] = useState('')
  const { pending, error, run } = useRun()
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <select className={cn(fieldClass, 'h-9 w-auto')} value={award} onChange={(event) => setAward(event.target.value)}>
          {AWARDS.map((entry) => (
            <option key={entry.id} value={entry.id}>{entry.icon} {t(entry.title)}{entry.kind === 'auto' ? ` (${t('automatic')})` : ''}</option>
          ))}
        </select>
        <input className={cn(fieldClass, 'h-9 w-56')} placeholder={t('Why (shown on the profile)')} value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} />
        {held.includes(award) ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => giveAward(userId, award, '', true), () => router.refresh())}>{t('Take back')}</Button>
        ) : (
          <Button size="sm" disabled={pending} onClick={() => run(() => giveAward(userId, award, note), () => { setNote(''); router.refresh() })}>{t('Give award')}</Button>
        )}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
