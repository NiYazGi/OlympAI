import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { CodeField, codeNotice } from '@/components/code-field'
import { Button } from '@/components/ui/button'
import { cn, fieldClass } from '@/lib/utils'
import { resendResetCode, resetPassword } from '@/app/auth/actions'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Choose a new password') }
}

const inputClass = cn(fieldClass, 'mt-2')

/**
 * The code from the reset email and the new password, in one form. The page
 * reads the same for any address — whether it has an account is never said.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const t = await getT()
  const { error, message } = await searchParams
  const notice = codeNotice(error, t)

  return (
    <AuthShell eyebrow={t('Account recovery')} title={t('Choose a new password')}>
      <p className="mb-5 text-sm leading-6 text-ash">
        {t('If that address has an account, we sent a six-digit code to it. It is valid for 15 minutes; check the spam folder if it is not in the inbox.')}
      </p>
      <form className="space-y-4" action={resetPassword}>
        {notice ? (
          <p role="alert" className="rounded-lg bg-ember/60 p-3 text-sm text-[#ffb3b3] shadow-key">
            {notice}
          </p>
        ) : null}
        {message ? <p className="rounded-lg bg-white/[0.05] p-3 text-sm text-ash shadow-key">{t(message)}</p> : null}

        <CodeField label={t('Code from the email')} />

        <label className="block text-[13px] font-medium text-ash">
          {t('New password')}
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            placeholder={t('At least 8 characters')}
            className={inputClass}
          />
        </label>

        <label className="block text-[13px] font-medium text-ash">
          {t('Repeat new password')}
          <input
            name="password_confirmation"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className={inputClass}
          />
        </label>

        <Button size="lg" className="h-11 w-full" type="submit">
          {t('Save new password')}
        </Button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        <form action={resendResetCode}>
          <button type="submit" className="text-ash underline-offset-4 hover:text-white hover:underline">
            {t('Send a new code')}
          </button>
        </form>
        <Link href="/login" className="text-ash underline-offset-4 hover:text-white hover:underline">
          {t('Back to log in')}
        </Link>
      </div>
    </AuthShell>
  )
}
