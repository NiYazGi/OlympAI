import Link from 'next/link'
import { CheckCircle2, Heart, Lock, MessageSquare, Pin } from 'lucide-react'
import { AuthorName, UserAvatar } from '@/components/community/user-avatar'
import type { ThreadSummary } from '@/lib/community'
import { ago } from '@/lib/admin/format'
import type { Locale, Translate } from '@/lib/i18n/config'
import { cardClass, cn } from '@/lib/utils'

export function ThreadList({ threads, t, locale, categories }: { threads: ThreadSummary[]; t: Translate; locale: Locale; categories?: Map<string, string> }) {
  if (!threads.length) return <p className={cn(cardClass, 'p-5 text-sm text-muted-foreground')}>{t('No threads here yet. Start the first one.')}</p>
  return (
    <ul className={cn(cardClass, 'divide-y divide-border overflow-hidden')}>
      {threads.map((thread) => (
        <li key={thread.id} className="flex gap-3 p-4 hover:bg-foreground/[0.02]">
          <UserAvatar author={thread.author} />
          <div className="min-w-0 flex-1">
            <Link href={`/forum/t/${thread.id}`} className="flex items-start gap-1.5 font-medium hover:text-primary">
              {thread.pinned ? <Pin className="mt-1 size-3.5 shrink-0 text-coral" /> : null}
              {thread.locked ? <Lock className="mt-1 size-3.5 shrink-0 text-muted-foreground" /> : null}
              {thread.solved ? <CheckCircle2 className="mt-1 size-3.5 shrink-0 text-success" /> : null}
              <span className="min-w-0 break-words">{thread.title}</span>
            </Link>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{thread.excerpt}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <AuthorName author={thread.author} />
              {categories ? <span>{t(categories.get(thread.category) ?? thread.category)}</span> : null}
              <span>{ago(thread.lastPostAt, t, locale)}</span>
            </p>
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground tabular-nums sm:flex">
            <span className="inline-flex items-center gap-1"><MessageSquare className="size-3.5" /> {thread.replies}</span>
            <span className="inline-flex items-center gap-1"><Heart className="size-3.5" /> {thread.likes}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
