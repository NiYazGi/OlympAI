import Link from 'next/link'
import { initials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Author } from '@/lib/community'

/** A member's picture (or initials), linking to their profile. */
export function UserAvatar({ author, size = 36, link = true }: { author: Pick<Author, 'id' | 'name' | 'username' | 'hasAvatar'>; size?: number; link?: boolean }) {
  const face = author.hasAvatar && author.id ? (
    // eslint-disable-next-line @next/next/no-img-element -- small, private, already sized
    <img src={`/api/community/avatar/${author.id}`} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex items-center justify-center rounded-full bg-foreground/[0.08] text-xs font-semibold text-muted-foreground" style={{ width: size, height: size }}>
      {initials(author.name)}
    </span>
  )
  return link && author.username ? (
    <Link href={`/u/${author.username}`} className={cn('shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring')} aria-label={author.name}>
      {face}
    </Link>
  ) : (
    <span className="shrink-0">{face}</span>
  )
}

export function AuthorName({ author }: { author: Pick<Author, 'name' | 'username' | 'isAdmin'> }) {
  const name = <span className="font-medium">{author.name}</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      {author.username ? <Link href={`/u/${author.username}`} className="hover:underline">{name}</Link> : name}
      {author.isAdmin ? <span className="rounded bg-coral/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-coral">OlympAI</span> : null}
    </span>
  )
}
