import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Eye, Lock } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { MathText } from '@/components/math-text'
import { AuthorName, UserAvatar } from '@/components/community/user-avatar'
import { LikeButton, ModerationBar, PostActions, ReplyForm } from '@/components/community/forum-client'
import { countView, getCategory, getThread } from '@/lib/community'
import { getSessionUserId } from '@/lib/supabase/auth'
import { isCurrentUserAdmin } from '@/lib/supabase/admin-guard'
import { ago } from '@/lib/admin/format'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const thread = await getThread((await params).id, null)
  return { title: thread?.title ?? 'Forum' }
}

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [t, locale, viewer, admin] = await Promise.all([getT(), getLocale(), getSessionUserId(), isCurrentUserAdmin()])
  const thread = await getThread(id, viewer)
  if (!thread) notFound()
  await countView(thread.id)
  const category = await getCategory(thread.category)
  const isAuthor = Boolean(viewer && thread.author.id === viewer)
  const solution = thread.posts.find((post) => post.isSolution)

  return (
    <>
      <BackLink href={`/forum/c/${thread.category}`}>{t(category?.name ?? 'Forum')}</BackLink>

      <article className={cn(cardClass, 'p-5 sm:p-6')}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 text-xl font-semibold break-words sm:text-2xl">{thread.title}</h1>
          {admin ? <ModerationBar threadId={thread.id} pinned={thread.pinned} locked={thread.locked} /> : null}
        </header>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <UserAvatar author={thread.author} />
          <div className="min-w-0 text-muted-foreground">
            <AuthorName author={thread.author} />
            <p className="text-xs">
              {ago(thread.createdAt, t, locale)}
              {thread.editedAt ? ` · ${t('edited')}` : ''} · <Eye className="inline size-3" /> {thread.views + 1}
            </p>
          </div>
        </div>
        {thread.taskId ? (
          <Link href={`/tasks/${thread.taskId}`} className="mt-4 inline-flex rounded-lg bg-foreground/[0.05] px-3 py-1.5 text-sm hover:bg-foreground/[0.08]">
            {t('Problem')}: {thread.taskTitle ?? thread.taskId}
          </Link>
        ) : null}
        <MathText text={thread.body} className="mt-4 break-words" />
        <div className="mt-4 flex flex-wrap items-center gap-1">
          <LikeButton threadId={thread.id} postId={null} count={thread.likes} liked={thread.liked} />
          <PostActions kind="thread" id={thread.id} threadId={thread.id} canEdit={isAuthor || admin} canMarkSolution={false} body={thread.body} title={thread.title} />
        </div>
      </article>

      {solution ? (
        <a href={`#post-${solution.id}`} className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/5 px-4 py-2.5 text-sm">
          <CheckCircle2 className="size-4 text-success" /> {t('Solved: the marked reply from {name}', { name: solution.author.name })}
        </a>
      ) : null}

      <section className="space-y-3">
        <h2 className="eyebrow">{t('{n} {n|reply|replies}', { n: thread.replies })}</h2>
        {thread.posts.map((post) => (
          <article
            key={post.id}
            id={`post-${post.id}`}
            className={cn(cardClass, 'scroll-mt-24 p-4 sm:p-5', post.isSolution && 'ring-2 ring-success/60')}
          >
            {post.deleted ? (
              <p className="text-sm text-muted-foreground italic">{t('This reply was deleted.')}</p>
            ) : (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <UserAvatar author={post.author} size={30} />
                  <div className="min-w-0 text-muted-foreground">
                    <AuthorName author={post.author} />
                    <p className="text-xs">{ago(post.createdAt, t, locale)}{post.editedAt ? ` · ${t('edited')}` : ''}</p>
                  </div>
                  {post.isSolution ? (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-success"><CheckCircle2 className="size-3.5" /> {t('Solution')}</span>
                  ) : null}
                </div>
                <MathText text={post.body} className="mt-3 break-words text-[15px]" />
                <div className="mt-3 flex flex-wrap items-center gap-1">
                  <LikeButton threadId={thread.id} postId={post.id} count={post.likes} liked={post.liked} />
                  <PostActions
                    kind="post"
                    id={post.id}
                    threadId={thread.id}
                    canEdit={Boolean(viewer && post.author.id === viewer) || admin}
                    canMarkSolution={(isAuthor || admin) && post.author.id !== thread.author.id}
                    isSolution={post.isSolution}
                    body={post.body}
                  />
                </div>
              </>
            )}
          </article>
        ))}
      </section>

      {thread.locked ? (
        <p className={cn(cardClass, 'flex items-center gap-2 p-4 text-sm text-muted-foreground')}>
          <Lock className="size-4" /> {t('This thread is closed for replies.')}
        </p>
      ) : (
        <section className={cn(cardClass, 'p-4 sm:p-5')}>
          <ReplyForm threadId={thread.id} />
        </section>
      )}
    </>
  )
}
