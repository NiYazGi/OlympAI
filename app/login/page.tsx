import { AuthForm } from '@/components/auth-form'

export const metadata = { title: 'Log in' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const params = await searchParams
  return <AuthForm mode="login" error={params.error} message={params.message} next={params.next} />
}
