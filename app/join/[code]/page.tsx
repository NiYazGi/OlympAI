import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { JoinClass } from '@/components/class/join-class'
import { Button } from '@/components/ui/button'
import { getSessionUserId } from '@/lib/supabase/auth'
import { getClassByCode, getMemberships, normaliseCode } from '@/lib/supabase/classes'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Join a class'), robots: { index: false, follow: false } }
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
      <AuthShell eyebrow={t('Join a class')} title={t('That link does not match a class')}>
        <p className="text-sm leading-6 text-muted-foreground">{t('The code may have been changed, or the class deleted. Ask your teacher for the current link.')}</p>
        <Button
          className="mt-6 h-11"
          nativeButton={false}
          render={<Link href="/dashboard">{t('Dashboard')}</Link>}
        />
      </AuthShell>
    )
  }

  const userId = await getSessionUserId()
  const next = `/join/${code}`

  if (!userId) {
    return (
      <AuthShell eyebrow={t('Join a class')} title={t('You have been invited to {name}', { name: found.name })}>
        <p className="text-sm leading-6 text-muted-foreground">
          {found.teacherName ? `${t('Teacher')}: ${found.teacherName}. ` : ''}
          {t('Create an account or log in, and you land straight in the class.')}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            className="h-11"
            nativeButton={false}
            render={
              <Link href={`/signup?next=${encodeURIComponent(next)}`}>{t('Create an account')}</Link>
            }
          />
          <Button
            className="h-11"
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/login?next=${encodeURIComponent(next)}`}>{t('Log in')}</Link>
            }
          />
        </div>
      </AuthShell>
    )
  }

  const [profile, memberships] = await Promise.all([getCurrentProfile(), getMemberships()])

  if (profile?.role === 'teacher') {
    return (
      <AuthShell eyebrow={t('Join a class')} title={found.name}>
        <p className="text-sm leading-6 text-muted-foreground">{t('You are signed in as a teacher, so there is nothing to join here.')}</p>
        <Button
          className="mt-6 h-11"
          nativeButton={false}
          render={<Link href="/class">{t('Classes')}</Link>}
        />
      </AuthShell>
    )
  }

  if (memberships.some((membership) => membership.id === found.id)) {
    return (
      <AuthShell eyebrow={t('Join a class')} title={found.name}>
        <p className="text-sm leading-6 text-muted-foreground">{t('You are already in this class.')}</p>
        <Button
          className="mt-6 h-11"
          nativeButton={false}
          render={<Link href="/class">{t('Your class')}</Link>}
        />
      </AuthShell>
    )
  }

  return (
    <AuthShell eyebrow={t('Join a class')} title={t('You have been invited to {name}', { name: found.name })}>
      <p className="text-sm leading-6 text-muted-foreground">
        {found.teacherName ? `${t('Teacher')}: ${found.teacherName}. ` : ''}
        {t('Joining lets your teacher see the problems you solve here, and nothing else.')}
      </p>
      <div className="mt-6">
        <JoinClass code={code} locked redirectTo="/class" />
      </div>
    </AuthShell>
  )
}
