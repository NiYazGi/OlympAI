import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { getSessionUser } from '@/lib/db/auth'
import { getT } from '@/lib/i18n/server'
import { getSiteSettings } from '@/lib/admin/settings'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Create account') }
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const params = await searchParams
  if (await getSessionUser()) redirect(params.next?.startsWith('/') && !params.next.startsWith('//') ? params.next : '/dashboard')
  // Closed from the admin panel: said up front, not after the form is filled in.
  const { signupsOpen } = await getSiteSettings()
  const error = params.error ?? (signupsOpen ? undefined : 'New accounts are closed for now. Try again later.')
  return <AuthForm mode="signup" error={error} next={params.next} />
}
