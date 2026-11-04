import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SidebarAccountLink } from '@/components/app-sidebar'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { initials } from '@/lib/utils'
import { getT } from '@/lib/i18n/server'

/**
 * The account at the bottom of the sidebar.
 *
 * The only part of the sidebar that needs data, so it is an async server
 * component inside a Suspense boundary and the navigation around it paints
 * without waiting on the profile.
 */
export async function SidebarIdentity() {
  const t = await getT()
  const profile = await getCurrentProfile()
  const name = profile?.full_name?.trim() || t('your account')

  return (
    <SidebarAccountLink name={name}>
      <Avatar className="size-9 ring-1 ring-border">
        <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
          {initials(profile?.full_name ?? null)}
        </AvatarFallback>
      </Avatar>
    </SidebarAccountLink>
  )
}

export function SidebarIdentitySkeleton() {
  return <div className="h-[68px] w-full animate-pulse rounded-2xl bg-muted" aria-hidden />
}
