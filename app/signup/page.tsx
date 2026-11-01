import { getT } from '@/lib/i18n'
import { AuthForm } from '@/components/auth-form'

export async function generateMetadata() {
  const t = await getT()
  return { title: t.auth.createAccount }
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return <AuthForm mode="signup" error={params.error} />
}
