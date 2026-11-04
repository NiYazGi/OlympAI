import { redirect } from 'next/navigation'
import { OnboardingFlow } from '@/components/onboarding-flow'
import { getSessionUser } from '@/lib/db/auth'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Set up your training') }
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!(await getSessionUser())) redirect('/login')
  const { next } = await searchParams
  return <OnboardingFlow next={next} />
}