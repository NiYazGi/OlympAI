import 'server-only'

import { getEntitlement } from '@/lib/billing'
import { planIncludes, type Feature } from '@/lib/plan-features'

/**
 * Whether the signed-in student's plan includes a feature. With billing off
 * (the live site) every feature is open, exactly as before plans existed.
 */
export async function canUse(feature: Feature): Promise<boolean> {
  const entitlement = await getEntitlement()
  return planIncludes(entitlement.plan, feature)
}
