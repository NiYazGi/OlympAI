import { OnboardingFlow } from '@/components/onboarding-flow'

export const metadata = { title: 'Set up your training' }

/**
 * `next` is where the student was heading when they were asked to sign up —
 * a class invite, usually. Onboarding sits in the middle of that journey, so
 * it carries the destination rather than dropping everyone on the dashboard.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return <OnboardingFlow next={next} />
}
