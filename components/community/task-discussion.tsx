import Link from 'next/link'
import { MessagesSquare } from 'lucide-react'
import { communityEnabled, listThreads } from '@/lib/community'
import { getT } from '@/lib/i18n/server'

/** Under a problem: its forum threads, or a way to start one. Only with the community on. */
export async function TaskDiscussion({ taskId }: { taskId: string }) {
  if (!communityEnabled()) return null
  const [t, threads] = await Promise.all([getT(), listThreads({ taskId, limit: 3 })])
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {threads.map((thread) => (
        <Link key={thread.id} href={`/forum/t/${thread.id}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
          <MessagesSquare className="size-3.5" /> {thread.title.slice(0, 50)} ({thread.replies})
        </Link>
      ))}
      <Link href={`/forum/new?task=${encodeURIComponent(taskId)}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
        <MessagesSquare className="size-3.5" /> {t('Discuss on the forum')}
      </Link>
    </span>
  )
}
