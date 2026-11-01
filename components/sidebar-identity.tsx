import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getCurrentProfile, getProgressAnalytics } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n'
import { initials } from '@/lib/utils'

/**
 * The account, at the foot of the rail.
 *
 * The only part of the rail that needs data, so it is an async server
 * component inside a Suspense boundary and the navigation around it paints
 * without waiting on Supabase. It is the link to /me, written out with the
 * name now that the rail has room for words; the streak rides along as a
 * small count after it.
 */
export async function SidebarIdentity() {
  const [profile, analytics, t] = await Promise.all([
    getCurrentProfile(),
    getProgressAnalytics(),
    getT(),
  ])
  const name = profile?.full_name?.trim() || t.nav.yourAccount
  const streak = analytics.activeStreak

  return (
    <Link
      href="/me"
      prefetch
      aria-label={t.nav.accountAria(name)}
      title={streak > 0 ? `${name}, ${t.nav.streakTooltip(streak)}` : name}
      className="flex min-h-11 items-center gap-3 rounded-sm px-2 transition-colors hover:bg-sidebar-accent/70"
    >
      <Avatar className="size-8">
        <AvatarFallback className="bg-sidebar-accent text-xs font-bold text-sidebar-foreground">
          {initials(profile?.full_name ?? null)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate font-display text-[0.9375rem] font-semibold">
        {name}
      </span>
      {streak > 0 ? (
        <span className="font-figure text-base font-bold text-sidebar-primary tabular-nums">
          {streak}
        </span>
      ) : null}
    </Link>
  )
}

export function SidebarIdentitySkeleton() {
  return (
    <div className="flex min-h-11 items-center gap-3 px-2" aria-hidden>
      <div className="size-8 animate-pulse rounded-full bg-sidebar-accent" />
      <div className="h-3 w-28 animate-pulse rounded-sm bg-sidebar-accent" />
    </div>
  )
}
