import { AuthForm } from '@/components/auth-form'

export const metadata = { title: 'Create account' }

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return <AuthForm mode="signup" error={params.error} />
}
