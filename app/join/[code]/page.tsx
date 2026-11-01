import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { JoinClass } from '@/components/class/join-class'
import { Button } from '@/components/ui/button'
import { getSessionUserId } from '@/lib/supabase/auth'
import { getClassByCode, getMemberships, normaliseCode } from '@/lib/supabase/classes'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t.classes.joinTitle, robots: { index: false, follow: false } }
}

/**
 * The invite link.
 *
 * Public, because the person opening it usually has no account yet — that is
 * what an invitation is. It shows the class's name and who runs it, which is
 * what someone needs to decide whether this is the right link, and nothing
 * else: a code in a group chat must not expose a roster.
 *
 * Signing up from here carries the code through sign-up and onboarding on the
 * query string, so the last thing that happens to a new student is landing
 * back on this page with a Join button on it.
 */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params
  const t = await getT()
  const code = normaliseCode(decodeURIComponent(raw))
  const found = code ? await getClassByCode(code) : null

  if (!code || !found) {
    return (
      <AuthShell eyebrow={t.classes.joinTitle} title={t.classes.inviteUnknown}>
        <p className="text-sm leading-6 text-muted-foreground">{t.classes.inviteUnknownBody}</p>
        <Button
          className="mt-6 h-11"
          nativeButton={false}
          render={<Link href="/dashboard">{t.nav.dashboard}</Link>}
        />
      </AuthShell>
    )
  }

  const userId = await getSessionUserId()
  const next = `/join/${code}`

  if (!userId) {
    return (
      <AuthShell eyebrow={t.classes.joinTitle} title={t.classes.inviteHeading(found.name)}>
        <p className="text-sm leading-6 text-muted-foreground">
          {found.teacherName ? `${t.classes.teacher}: ${found.teacherName}. ` : ''}
          {t.classes.inviteSignedOut}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            className="h-11"
            nativeButton={false}
            render={
              <Link href={`/signup?next=${encodeURIComponent(next)}`}>{t.classes.inviteCreate}</Link>
            }
          />
          <Button
            className="h-11"
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/login?next=${encodeURIComponent(next)}`}>{t.classes.inviteLogIn}</Link>
            }
          />
        </div>
      </AuthShell>
    )
  }

  const [profile, memberships] = await Promise.all([getCurrentProfile(), getMemberships()])

  if (profile?.role === 'teacher') {
    return (
      <AuthShell eyebrow={t.classes.joinTitle} title={found.name}>
        <p className="text-sm leading-6 text-muted-foreground">{t.classes.teacherNote}</p>
        <Button
          className="mt-6 h-11"
          nativeButton={false}
          render={<Link href="/class">{t.classes.title}</Link>}
        />
      </AuthShell>
    )
  }

  if (memberships.some((membership) => membership.id === found.id)) {
    return (
      <AuthShell eyebrow={t.classes.joinTitle} title={found.name}>
        <p className="text-sm leading-6 text-muted-foreground">{t.classes.alreadyIn}</p>
        <Button
          className="mt-6 h-11"
          nativeButton={false}
          render={<Link href="/class">{t.classes.yourClasses}</Link>}
        />
      </AuthShell>
    )
  }

  return (
    <AuthShell eyebrow={t.classes.joinTitle} title={t.classes.inviteHeading(found.name)}>
      <p className="text-sm leading-6 text-muted-foreground">
        {found.teacherName ? `${t.classes.teacher}: ${found.teacherName}. ` : ''}
        {t.classes.inviteBody}
      </p>
      <div className="mt-6">
        <JoinClass code={code} locked redirectTo="/class" />
      </div>
    </AuthShell>
  )
}
