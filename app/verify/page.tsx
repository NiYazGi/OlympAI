import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { CodeField, codeNotice } from '@/components/code-field'
import { Button } from '@/components/ui/button'
import { resendSignupCode, verifySignup } from '@/app/auth/actions'
import { getPendingCode } from '@/lib/db/auth'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Confirm your email') }
}

/**
 * After signing up, or signing in to an account that was never confirmed: the
 * code from the email. The account is found through the pending cookie, so the
 * address is not in the URL; only a masked form of it is shown.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const t = await getT()
  const { error, message } = await searchParams
  const pending = await getPendingCode('signup')

  if (!pending) {
    return (
      <AuthShell eyebrow={t('Create account')} title={t('Confirm your email')}>
        <p className="text-sm leading-6 text-ash">
          {t('This confirmation is no longer open. Log in with your email and password and we will send a new code.')}
        </p>
        <Button size="lg" className="mt-6 h-11 w-full" nativeButton={false} render={<Link href="/login">{t('Log in')}</Link>} />
      </AuthShell>
    )
  }

  const notice = codeNotice(error, t)
  return (
    <AuthShell eyebrow={t('Create account')} title={t('Confirm your email')}>
      <p className="mb-5 text-sm leading-6 text-ash">
        {t('We sent a six-digit code to {email}. It is valid for 15 minutes.', { email: pending.email })}{' '}
        {t('If it is not in the inbox, check the spam folder.')}
      </p>
      <form className="space-y-4" action={verifySignup}>
        {notice ? (
          <p role="alert" className="rounded-lg bg-ember/60 p-3 text-sm text-destructive shadow-key">
            {notice}
          </p>
        ) : null}
        {message ? <p className="rounded-lg bg-foreground/[0.05] p-3 text-sm text-ash shadow-key">{t(message)}</p> : null}
        <CodeField label={t('Code from the email')} />
        <Button size="lg" className="h-11 w-full" type="submit">
          {t('Confirm')}
        </Button>
      </form>
      <form action={resendSignupCode} className="mt-4 text-center">
        <button type="submit" className="text-sm text-ash underline-offset-4 hover:text-foreground hover:underline">
          {t('Send a new code')}
        </button>
      </form>
    </AuthShell>
  )
}
