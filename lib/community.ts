import 'server-only'

import { getDb } from '@/lib/db'
import { AWARDS } from '@/lib/awards'

/**
 * The forum, public profiles and awards. Switched on per deployment
 * (OLYMPAI_COMMUNITY=1). Every function trusts its userId argument: callers
 * (server actions, server components) take it from the verified session.
 */

export function communityEnabled() {
  return process.env.OLYMPAI_COMMUNITY === '1'
}

export type Author = { id: string | null; name: string; username: string | null; isAdmin: boolean; hasAvatar: boolean }

type AuthorRow = { author_id: string | null; full_name: string | null; username: string | null; is_admin: boolean | null; has_avatar: boolean | null }

const AUTHOR_COLUMNS = `p.full_name, p.username, p.is_admin, exists (select 1 from public.profile_avatars a where a.user_id = p.id) as has_avatar`

function author(row: AuthorRow): Author {
  return {
    id: row.author_id,
    name: row.full_name?.trim() || row.username || 'OlympAI',
    username: row.username,
    isAdmin: Boolean(row.is_admin),
    hasAvatar: Boolean(row.has_avatar),
  }
}

export type Category = { slug: string; name: string; description: string; adminOnly: boolean; threads: number; lastPostAt: string | null }

export async function listCategories(): Promise<Category[]> {
  const db = await getDb()
  const { rows } = await db.query<{ slug: string; name: string; description: string; admin_only: boolean; threads: number; last_post_at: string | null }>(
    `select c.slug, c.name, c.description, c.admin_only,
            count(t.id)::int as threads, max(t.last_post_at) as last_post_at
       from public.forum_categories c
       left join public.forum_threads t on t.category = c.slug and t.deleted_at is null
      group by c.slug order by c.position`,
  )
  return rows.map((row) => ({ slug: row.slug, name: row.name, description: row.description, adminOnly: row.admin_only, threads: row.threads, lastPostAt: row.last_post_at }))
}

export async function getCategory(slug: string) {
  return (await listCategories()).find((category) => category.slug === slug) ?? null
}

export type ThreadSummary = {
  id: string
  category: string
  title: string
  excerpt: string
  author: Author
  pinned: boolean
  locked: boolean
  solved: boolean
  replies: number
  views: number
  likes: number
  createdAt: string
  lastPostAt: string
  taskId: string | null
}

type ThreadRow = AuthorRow & {
  id: string; category: string; title: string; body: string; pinned: boolean; locked: boolean; solved_post_id: string | null
  reply_count: number; view_count: number; likes: number; created_at: string; last_post_at: string; task_id: string | null
}

function summary(row: ThreadRow): ThreadSummary {
  return {
    id: row.id, category: row.category, title: row.title,
    excerpt: row.body.replace(/\s+/g, ' ').slice(0, 180),
    author: author(row), pinned: row.pinned, locked: row.locked, solved: Boolean(row.solved_post_id),
    replies: row.reply_count, views: row.view_count, likes: row.likes,
    createdAt: row.created_at, lastPostAt: row.last_post_at, taskId: row.task_id,
  }
}

const THREAD_SELECT = `select t.id, t.category, t.title, t.body, t.pinned, t.locked, t.solved_post_id, t.reply_count, t.view_count,
        t.created_at, t.last_post_at, t.task_id, t.author_id,
        (select count(*)::int from public.forum_likes l where l.thread_id = t.id and l.post_id is null) as likes,
        ${AUTHOR_COLUMNS}
   from public.forum_threads t left join public.profiles p on p.id = t.author_id`

export async function listThreads(options: { category?: string; taskId?: string; authorId?: string; query?: string; limit?: number; offset?: number }) {
  const db = await getDb()
  const where = ['t.deleted_at is null']
  const params: unknown[] = []
  if (options.category) {
    params.push(options.category)
    where.push(`t.category = $${params.length}`)
  }
  if (options.taskId) {
    params.push(options.taskId)
    where.push(`t.task_id = $${params.length}`)
  }
  if (options.authorId) {
    params.push(options.authorId)
    where.push(`t.author_id = $${params.length}`)
  }
  if (options.query?.trim()) {
    params.push(`%${options.query.trim().replace(/[%_\\]/g, (c) => `\\${c}`)}%`)
    where.push(`(t.title ilike $${params.length} or t.body ilike $${params.length})`)
  }
  params.push(options.limit ?? 30, options.offset ?? 0)
  const { rows } = await db.query<ThreadRow>(
    `${THREAD_SELECT} where ${where.join(' and ')}
      order by ${options.category ? 't.pinned desc, ' : ''}t.last_post_at desc
      limit $${params.length - 1} offset $${params.length}`,
    params,
  )
  return rows.map(summary)
}

export type Post = { id: string; body: string; author: Author; createdAt: string; editedAt: string | null; deleted: boolean; likes: number; liked: boolean; isSolution: boolean }

export type ThreadDetail = ThreadSummary & { body: string; editedAt: string | null; liked: boolean; posts: Post[]; solvedPostId: string | null; taskTitle: string | null }

export async function getThread(id: string, viewerId: string | null): Promise<ThreadDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const db = await getDb()
  const { rows } = await db.query<ThreadRow & { edited_at: string | null; task_title: string | null; liked: boolean }>(
    `select x.*, (select title from public.tasks where id = x.task_id) as task_title,
            exists (select 1 from public.forum_likes l where l.thread_id = x.id and l.post_id is null and l.user_id = $2) as liked
       from (${THREAD_SELECT.replace('t.task_id, t.author_id,', 't.task_id, t.author_id, t.edited_at,')} where t.id = $1 and t.deleted_at is null) x`,
    [id, viewerId],
  )
  const row = rows[0]
  if (!row) return null
  const { rows: posts } = await db.query<AuthorRow & { id: string; body: string; created_at: string; edited_at: string | null; deleted_at: string | null; likes: number; liked: boolean }>(
    `select f.id, f.body, f.created_at, f.edited_at, f.deleted_at, f.author_id,
            (select count(*)::int from public.forum_likes l where l.post_id = f.id) as likes,
            exists (select 1 from public.forum_likes l where l.post_id = f.id and l.user_id = $2) as liked,
            ${AUTHOR_COLUMNS}
       from public.forum_posts f left join public.profiles p on p.id = f.author_id
      where f.thread_id = $1 order by f.created_at`,
    [id, viewerId],
  )
  return {
    ...summary(row),
    body: row.body,
    editedAt: row.edited_at,
    liked: row.liked,
    solvedPostId: row.solved_post_id,
    taskTitle: row.task_title,
    posts: posts.map((post) => ({
      id: post.id,
      body: post.deleted_at ? '' : post.body,
      author: author(post),
      createdAt: post.created_at,
      editedAt: post.edited_at,
      deleted: Boolean(post.deleted_at),
      likes: post.likes,
      liked: post.liked,
      isSolution: row.solved_post_id === post.id,
    })),
  }
}

export async function countView(id: string) {
  const db = await getDb()
  await db.query('update public.forum_threads set view_count = view_count + 1 where id = $1', [id])
}

/** Posts and threads in the last ten minutes, for a simple flood limit. */
export async function recentWrites(userId: string) {
  const db = await getDb()
  const { rows } = await db.query<{ n: number }>(
    `select ((select count(*) from public.forum_posts where author_id = $1 and created_at > now() - interval '10 minutes')
           + (select count(*) from public.forum_threads where author_id = $1 and created_at > now() - interval '10 minutes'))::int as n`,
    [userId],
  )
  return rows[0]?.n ?? 0
}

export async function createThread(userId: string, input: { category: string; title: string; body: string; taskId: string | null }) {
  const db = await getDb()
  const { rows } = await db.query<{ id: string }>(
    `insert into public.forum_threads (category, author_id, title, body, task_id)
     values ($1, $2, $3, $4, (select id from public.tasks where id = $5)) returning id`,
    [input.category, userId, input.title, input.body, input.taskId],
  )
  await syncAwards(userId)
  return rows[0].id
}

export async function createPost(userId: string, threadId: string, body: string) {
  const db = await getDb()
  const id = await db.transaction(async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `insert into public.forum_posts (thread_id, author_id, body)
       select id, $2, $3 from public.forum_threads where id = $1 and deleted_at is null and not locked
       returning id`,
      [threadId, userId, body],
    )
    if (!rows[0]) return null
    await tx.query('update public.forum_threads set reply_count = reply_count + 1, last_post_at = now() where id = $1', [threadId])
    return rows[0].id
  })
  if (id) await syncAwards(userId)
  return id
}

export async function editThread(threadId: string, title: string, body: string) {
  const db = await getDb()
  await db.query('update public.forum_threads set title = $2, body = $3, edited_at = now() where id = $1', [threadId, title, body])
}

export async function editPost(postId: string, body: string) {
  const db = await getDb()
  await db.query('update public.forum_posts set body = $2, edited_at = now() where id = $1 and deleted_at is null', [postId, body])
}

export async function threadOwner(threadId: string) {
  const db = await getDb()
  const { rows } = await db.query<{ author_id: string | null; locked: boolean; category: string }>('select author_id, locked, category from public.forum_threads where id = $1 and deleted_at is null', [threadId])
  return rows[0] ?? null
}

export async function postOwner(postId: string) {
  const db = await getDb()
  const { rows } = await db.query<{ author_id: string | null; thread_id: string }>('select author_id, thread_id from public.forum_posts where id = $1 and deleted_at is null', [postId])
  return rows[0] ?? null
}

export async function deletePost(postId: string) {
  const db = await getDb()
  await db.transaction(async (tx) => {
    const { rows } = await tx.query<{ thread_id: string }>('update public.forum_posts set deleted_at = now() where id = $1 and deleted_at is null returning thread_id', [postId])
    if (rows[0]) {
      await tx.query('update public.forum_threads set reply_count = greatest(0, reply_count - 1), solved_post_id = nullif(solved_post_id, $2) where id = $1', [rows[0].thread_id, postId])
    }
  })
}

export async function deleteThread(threadId: string) {
  const db = await getDb()
  await db.query('update public.forum_threads set deleted_at = now() where id = $1', [threadId])
}

export async function setThreadFlags(threadId: string, flags: { pinned?: boolean; locked?: boolean }) {
  const db = await getDb()
  if (flags.pinned !== undefined) await db.query('update public.forum_threads set pinned = $2 where id = $1', [threadId, flags.pinned])
  if (flags.locked !== undefined) await db.query('update public.forum_threads set locked = $2 where id = $1', [threadId, flags.locked])
}

/** Marks (or clears, with null) the reply that solved the thread. */
export async function setSolution(threadId: string, postId: string | null) {
  const db = await getDb()
  const { rows } = await db.query<{ author_id: string | null }>(
    `update public.forum_threads t set solved_post_id = $2
      where t.id = $1 and ($2::uuid is null or exists (select 1 from public.forum_posts f where f.id = $2 and f.thread_id = t.id and f.deleted_at is null))
      returning (select author_id from public.forum_posts where id = $2)`,
    [threadId, postId],
  )
  const helper = rows[0]?.author_id
  if (helper) await syncAwards(helper)
}

export async function toggleLike(userId: string, threadId: string, postId: string | null) {
  const db = await getDb()
  const removed = await db.query(
    `delete from public.forum_likes where thread_id = $1 and coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce($2::uuid, '00000000-0000-0000-0000-000000000000'::uuid) and user_id = $3`,
    [threadId, postId, userId],
  )
  if (removed.affectedRows) return false
  const { rows } = await db.query<{ author_id: string | null }>(
    `insert into public.forum_likes (thread_id, post_id, user_id)
     select $1, $2, $3 where exists (select 1 from public.forum_threads where id = $1 and deleted_at is null)
     returning (case when $2::uuid is null then (select author_id from public.forum_threads where id = $1) else (select author_id from public.forum_posts where id = $2) end) as author_id`,
    [threadId, postId, userId],
  )
  const liked = rows[0]?.author_id
  if (liked && liked !== userId) await syncAwards(liked)
  return true
}

// ----------------------------------------------------------------- awards ---

export type HeldAward = { award: string; note: string; createdAt: string; grantedBy: string | null }

export async function awardsFor(userId: string): Promise<HeldAward[]> {
  const db = await getDb()
  const { rows } = await db.query<{ award: string; note: string; created_at: string; granted_by: string | null }>(
    'select award, note, created_at, granted_by from public.user_awards where user_id = $1 order by created_at desc',
    [userId],
  )
  return rows.map((row) => ({ award: row.award, note: row.note, createdAt: row.created_at, grantedBy: row.granted_by }))
}

/** Gives every automatic award whose condition the account now meets. Never takes one away. */
export async function syncAwards(userId: string) {
  const db = await getDb()
  const { rows } = await db.query<{ solved: number; subjects: number; threads: number; replies: number; solutions: number; likes: number }>(
    `select
       (select count(distinct a.task_id)::int from public.task_attempts a where a.user_id = $1 and a.is_correct) as solved,
       (select count(distinct t.subject_id)::int from public.task_attempts a join public.tasks t on t.id = a.task_id where a.user_id = $1 and a.is_correct) as subjects,
       (select count(*)::int from public.forum_threads where author_id = $1 and deleted_at is null) as threads,
       (select count(*)::int from public.forum_posts where author_id = $1 and deleted_at is null) as replies,
       (select count(*)::int from public.forum_threads t join public.forum_posts f on f.id = t.solved_post_id where f.author_id = $1 and t.author_id is distinct from $1) as solutions,
       (select count(*)::int from public.forum_likes l
          left join public.forum_posts f on f.id = l.post_id
          left join public.forum_threads t on t.id = l.thread_id and l.post_id is null
         where coalesce(f.author_id, t.author_id) = $1 and l.user_id <> $1) as likes`,
    [userId],
  )
  const s = rows[0]
  if (!s) return
  const earned = [
    s.solved >= 1 && 'solver-1',
    s.solved >= 10 && 'solver-10',
    s.solved >= 50 && 'solver-50',
    s.solved >= 150 && 'solver-150',
    s.subjects >= 3 && 'three-subjects',
    s.threads >= 1 && 'first-thread',
    s.replies >= 1 && 'first-reply',
    s.solutions >= 1 && 'helper',
    s.solutions >= 5 && 'mentor',
    s.likes >= 10 && 'liked-10',
  ].filter(Boolean) as string[]
  for (const award of earned) {
    await db.query('insert into public.user_awards (user_id, award) values ($1, $2) on conflict (user_id, award) do nothing', [userId, award])
  }
}

export async function grantAward(userId: string, award: string, note: string, by: string) {
  if (!AWARDS.some((entry) => entry.id === award)) return false
  const db = await getDb()
  await db.query(
    `insert into public.user_awards (user_id, award, note, granted_by) values ($1, $2, $3, $4)
     on conflict (user_id, award) do update set note = excluded.note, granted_by = excluded.granted_by`,
    [userId, award, note.slice(0, 200), by],
  )
  return true
}

export async function revokeAward(userId: string, award: string) {
  const db = await getDb()
  await db.query('delete from public.user_awards where user_id = $1 and award = $2', [userId, award])
}

// ---------------------------------------------------------------- profiles ---

export type PublicProfile = {
  id: string
  name: string
  username: string
  grade: string | null
  subject: string | null
  bio: string | null
  role: string
  isAdmin: boolean
  hasAvatar: boolean
  joinedAt: string
  solved: number
  attempts: number
  accuracy: number | null
  activeDays: number
  bySubject: { subject: string; solved: number }[]
  threads: number
  replies: number
  solutions: number
}

export async function profileByUsername(username: string): Promise<PublicProfile | null> {
  if (!/^[a-z0-9_.-]{2,40}$/i.test(username)) return null
  const db = await getDb()
  const { rows } = await db.query<{
    id: string; full_name: string | null; username: string; grade: string | null; primary_subject: string | null; bio: string | null; role: string
    is_admin: boolean; has_avatar: boolean; created_at: string; solved: number; attempts: number; correct: number; active_days: number
    threads: number; replies: number; solutions: number
  }>(
    `select p.id, p.full_name, p.username, p.grade, p.primary_subject, p.bio, p.role, p.is_admin, p.created_at,
            exists (select 1 from public.profile_avatars a where a.user_id = p.id) as has_avatar,
            (select count(distinct task_id)::int from public.task_attempts where user_id = p.id and is_correct) as solved,
            (select count(*)::int from public.task_attempts where user_id = p.id) as attempts,
            (select count(*)::int from public.task_attempts where user_id = p.id and is_correct) as correct,
            (select count(distinct (created_at at time zone 'Asia/Almaty')::date)::int from public.task_attempts where user_id = p.id) as active_days,
            (select count(*)::int from public.forum_threads where author_id = p.id and deleted_at is null) as threads,
            (select count(*)::int from public.forum_posts where author_id = p.id and deleted_at is null) as replies,
            (select count(*)::int from public.forum_threads t join public.forum_posts f on f.id = t.solved_post_id where f.author_id = p.id) as solutions
       from public.profiles p where lower(p.username) = lower($1)`,
    [username],
  )
  const row = rows[0]
  if (!row) return null
  const { rows: subjects } = await db.query<{ subject: string; solved: number }>(
    `select s.name as subject, count(distinct a.task_id)::int as solved
       from public.task_attempts a join public.tasks t on t.id = a.task_id join public.subjects s on s.id = t.subject_id
      where a.user_id = $1 and a.is_correct group by s.name order by solved desc`,
    [row.id],
  )
  return {
    id: row.id, name: row.full_name?.trim() || row.username, username: row.username, grade: row.grade, subject: row.primary_subject,
    bio: row.bio, role: row.role, isAdmin: row.is_admin, hasAvatar: row.has_avatar, joinedAt: row.created_at,
    solved: row.solved, attempts: row.attempts, accuracy: row.attempts ? Math.round((row.correct / row.attempts) * 100) : null,
    activeDays: row.active_days, bySubject: subjects, threads: row.threads, replies: row.replies, solutions: row.solutions,
  }
}

export async function usernameFor(userId: string) {
  const db = await getDb()
  const { rows } = await db.query<{ username: string | null }>('select username from public.profiles where id = $1', [userId])
  return rows[0]?.username ?? null
}

export async function setBio(userId: string, bio: string) {
  const db = await getDb()
  await db.query('update public.profiles set bio = nullif($2, \'\') where id = $1', [userId, bio.slice(0, 300)])
}

/** Ranked by solved problems, for the community page. */
export async function topMembers(limit = 10) {
  const db = await getDb()
  const { rows } = await db.query<{ username: string; full_name: string | null; solved: number; awards: number }>(
    `select p.username, p.full_name,
            (select count(distinct task_id)::int from public.task_attempts where user_id = p.id and is_correct) as solved,
            (select count(*)::int from public.user_awards where user_id = p.id) as awards
       from public.profiles p where p.username is not null and p.role = 'student'
      order by solved desc, awards desc limit $1`,
    [limit],
  )
  return rows.filter((row) => row.solved > 0 || row.awards > 0)
}

/** An avatar for any account, served only to signed-in viewers of the community. */
export async function avatarFor(userId: string) {
  const db = await getDb()
  const { rows } = await db.query<{ webp_base64: string; updated_at: string }>('select webp_base64, updated_at from public.profile_avatars where user_id = $1', [userId])
  return rows[0] ?? null
}
