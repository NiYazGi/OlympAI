/** Shared with client components; lib/billing.ts is server-only. */
export type PlanId = 'free' | 'plus' | 'unlimit'

export const PLAN_IDS: PlanId[] = ['free', 'plus', 'unlimit']

export function isPlanId(value: unknown): value is PlanId {
  return value === 'free' || value === 'plus' || value === 'unlimit'
}
