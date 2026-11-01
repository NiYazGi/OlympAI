import { getT } from '@/lib/i18n'
import { AuthForm } from '@/components/auth-form'

export async function generateMetadata() {
  const t = await getT()
  return { title: t.auth.logIn }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const params = await searchParams
  return <AuthForm mode="login" error={params.error} message={params.message} next={params.next} />
}
