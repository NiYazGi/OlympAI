'use server'

import { revalidatePath } from 'next/cache'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { isCurrentUserAdmin } from '@/lib/supabase/admin-guard'
import {
  communityEnabled,
  createPost,
  createThread,
  deletePost,
  deleteThread,
  editPost,
  editThread,
  getCategory,
  grantAward,
  postOwner,
  recentWrites,
  revokeAward,
  setBio,
  setSolution,
  setThreadFlags,
  threadOwner,
  toggleLike,
} from '@/lib/community'
import { getT } from '@/lib/i18n/server'

export type ForumResult = { ok: true; id?: string; liked?: boolean } | { ok: false; error: string }

const UUID = /^[0-9a-f-]{36}$/i
const FLOOD_LIMIT = 8

async function gate() {
  const t = await getT()
  if (!communityEnabled()) return { error: t('The forum is not available here yet.') } as const
  const user = await getVerifiedUser()
  if (!user) return { error: t('Your session has expired. Please log in again.') } as const
  return { user, admin: await isCurrentUserAdmin(), t } as const
}

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim().slice(0, max) : ''
}

export async function newThread(input: { category: string; title: string; body: string; taskId?: string | null }): Promise<ForumResult> {
  const g = await gate()
  if ('error' in g) return { ok: false, error: g.error! }
  const { user, admin, t } = g
  const category = await getCategory(String(input.category))
  if (!category) return { ok: false, error: t('Choose a section.') }
  if (category.adminOnly && !admin) return { ok: false, error: t('Only the team posts in this section.') }
  const title = text(input.title, 160)
  const body = text(input.body, 20000)
  if (title.length < 3) return { ok: false, error: t('The title is too short.') }
  if (!body) return { ok: false, error: t('Write the message first.') }
  if ((await recentWrites(user.id)) >= FLOOD_LIMIT) return { ok: false, error: t('Too many posts in a few minutes. Wait a little and try again.') }
  const id = await createThread(user.id, { category: category.slug, title, body, taskId: input.taskId ? String(input.taskId).slice(0, 120) : null })
  revalidatePath('/forum')
  return { ok: true, id }
}

export async function reply(threadId: string, body: string): Promise<ForumResult> {
  const g = await gate()
  if ('error' in g) return { ok: false, error: g.error! }
  const { user, t } = g
  if (!UUID.test(threadId)) return { ok: false, error: t('Malformed request body.') }
  const clean = text(body, 20000)
  if (!clean) return { ok: false, error: t('Write the message first.') }
  if ((await recentWrites(user.id)) >= FLOOD_LIMIT) return { ok: false, error: t('Too many posts in a few minutes. Wait a little and try again.') }
  const id = await createPost(user.id, threadId, clean)
  if (!id) return { ok: false, error: t('This thread is closed for replies.') }
  revalidatePath(`/forum/t/${threadId}`)
  return { ok: true, id }
}

export async function like(threadId: string, postId: string | null): Promise<ForumResult> {
  const g = await gate()
  if ('error' in g) return { ok: false, error: g.error! }
  if (!UUID.test(threadId) || (postId && !UUID.test(postId))) return { ok: false, error: g.t('Malformed request body.') }
  const liked = await toggleLike(g.user.id, threadId, postId)
  revalidatePath(`/forum/t/${threadId}`)
  return { ok: true, liked }
}

export async function markSolution(threadId: string, postId: string | null): Promise<ForumResult> {
  const g = await gate()
  if ('error' in g) return { ok: false, error: g.error! }
  const { user, admin, t } = g
  if (!UUID.test(threadId) || (postId && !UUID.test(postId))) return { ok: false, error: t('Malformed request body.') }
  const thread = await threadOwner(threadId)
  if (!thread) return { ok: false, error: t('That thread was not found.') }
  if (thread.author_id !== user.id && !admin) return { ok: false, error: t('Only the author of the thread can mark the solution.') }
  await setSolution(threadId, postId)
  revalidatePath(`/forum/t/${threadId}`)
  return { ok: true }
}

export async function edit(kind: 'thread' | 'post', id: string, input: { title?: string; body: string }): Promise<ForumResult> {
  const g = await gate()
  if ('error' in g) return { ok: false, error: g.error! }
  const { user, admin, t } = g
  if (!UUID.test(id)) return { ok: false, error: t('Malformed request body.') }
  const body = text(input.body, 20000)
  if (!body) return { ok: false, error: t('Write the message first.') }
  if (kind === 'thread') {
    const thread = await threadOwner(id)
    if (!thread || (thread.author_id !== user.id && !admin)) return { ok: false, error: t('You can only edit your own posts.') }
    const title = text(input.title, 160)
    if (title.length < 3) return { ok: false, error: t('The title is too short.') }
    await editThread(id, title, body)
    revalidatePath(`/forum/t/${id}`)
  } else {
    const post = await postOwner(id)
    if (!post || (post.author_id !== user.id && !admin)) return { ok: false, error: t('You can only edit your own posts.') }
    await editPost(id, body)
    revalidatePath(`/forum/t/${post.thread_id}`)
  }
  return { ok: true }
}

export async function remove(kind: 'thread' | 'post', id: string): Promise<ForumResult> {
  const g = await gate()
  if ('error' in g) return { ok: false, error: g.error! }
  const { user, admin, t } = g
  if (!UUID.test(id)) return { ok: false, error: t('Malformed request body.') }
  if (kind === 'thread') {
    const thread = await threadOwner(id)
    if (!thread || (thread.author_id !== user.id && !admin)) return { ok: false, error: t('You can only delete your own posts.') }
    await deleteThread(id)
    revalidatePath('/forum')
  } else {
    const post = await postOwner(id)
    if (!post || (post.author_id !== user.id && !admin)) return { ok: false, error: t('You can only delete your own posts.') }
    await deletePost(id)
    revalidatePath(`/forum/t/${post.thread_id}`)
  }
  return { ok: true }
}

export async function moderate(threadId: string, flags: { pinned?: boolean; locked?: boolean }): Promise<ForumResult> {
  const g = await gate()
  if ('error' in g) return { ok: false, error: g.error! }
  if (!g.admin) return { ok: false, error: g.t('Only an administrator can do that.') }
  if (!UUID.test(threadId)) return { ok: false, error: g.t('Malformed request body.') }
  await setThreadFlags(threadId, flags)
  revalidatePath(`/forum/t/${threadId}`)
  revalidatePath('/forum')
  return { ok: true }
}

export async function saveBio(bio: string): Promise<ForumResult> {
  const g = await gate()
  if ('error' in g) return { ok: false, error: g.error! }
  await setBio(g.user.id, text(bio, 300))
  revalidatePath('/u', 'layout')
  return { ok: true }
}

export async function giveAward(userId: string, award: string, note: string, take = false): Promise<ForumResult> {
  const g = await gate()
  if ('error' in g) return { ok: false, error: g.error! }
  if (!g.admin) return { ok: false, error: g.t('Only an administrator can do that.') }
  if (!UUID.test(userId)) return { ok: false, error: g.t('Malformed request body.') }
  if (take) await revokeAward(userId, award)
  else if (!(await grantAward(userId, award, text(note, 200), g.user.id))) return { ok: false, error: g.t('Malformed request body.') }
  revalidatePath('/u', 'layout')
  return { ok: true }
}
