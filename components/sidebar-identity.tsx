import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getCurrentProfile, getProgressAnalytics } from '@/lib/supabase/queries'
import { cn, initials } from '@/lib/utils'
import { getT } from '@/lib/i18n/server'

/**
 * The account, at the top of the rail.
 *
 * The only part of the sidebar that needs data, so it is an async server
 * component inside a Suspense boundary and the navigation around it paints
 * without waiting on Supabase.
 *
 * It doubles as the link to /me: on a rail this narrow there is no room for a
 * labelled entry, and the avatar is where people look for their account
 * anyway. The streak rides along as a badge rather than a line of text.
 */
export async function SidebarIdentity() {
  const t = await getT()
  const [profile, analytics] = await Promise.all([getCurrentProfile(), getProgressAnalytics()])
  const name = profile?.full_name?.trim() || t('your account')
  const streak = analytics.activeStreak

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link href="/me" prefetch aria-label={t('{name} — your account', { name })} className="relative">
            <Avatar className="size-10 ring-1 ring-white/10 transition-[box-shadow] hover:ring-white/30">
              <AvatarFallback className="bg-graphite text-[13px] font-medium text-mist">
                {initials(profile?.full_name ?? null)}
              </AvatarFallback>
            </Avatar>
            {streak > 0 ? (
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full',
                  'bg-coral px-1 text-[10px] font-semibold tabular-nums text-void',
                  'ring-2 ring-ink',
                )}
              >
                {streak}
              </span>
            ) : null}
          </Link>
        }
      />
      <TooltipContent side="right">
        {name}
        {streak > 0 ? t(' · {n} day streak', { n: streak }) : ''}
      </TooltipContent>
    </Tooltip>
  )
}

export function SidebarIdentitySkeleton() {
  return <div className="size-10 animate-pulse rounded-full bg-white/[0.06]" aria-hidden />
}
