import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { getSessionUser } from '@/lib/db/auth'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Log in') }
}

function safeNext(path: string | undefined) {
  // Same-origin paths only, so `next` cannot be used as an open redirect.
  return path && path.startsWith('/') && !path.startsWith('//') ? path : '/dashboard'
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const params = await searchParams
  // A live session skips the form. Checked here rather than in the proxy,
  // which only sees that a cookie exists, not whether it is still valid.
  if (!params.error && !params.message && (await getSessionUser())) redirect(safeNext(params.next))
  return (
    <AuthForm
      mode="login"
      error={params.error}
      message={params.message}
      next={params.next}
    />
  )
}
