import type { PlanId } from '@/lib/billing-types'

/**
 * What each plan includes, as sold on the Plans page, and which part of the
 * app each paid feature switches on. Shared by the server (access checks) and
 * the client (copy). Free has no monthly AI caps at launch; the hourly limits
 * in lib/rate-limit.ts still protect the service.
 */

export type Feature =
  | 'plan'
  | 'mistakes'
  | 'weakSets'
  | 'analytics'
  | 'mocks'
  | 'dailyCoach'
  | 'deepReview'
  | 'realPapers'
  | 'skillMap'
  | 'strategy'
  | 'weeklyReport'

export const PLAN_RANK: Record<PlanId, number> = { free: 0, plus: 1, unlimit: 2 }

/** The lowest plan that includes the feature. */
export const FEATURE_PLAN: Record<Feature, PlanId> = {
  plan: 'plus',
  mistakes: 'plus',
  weakSets: 'plus',
  analytics: 'plus',
  mocks: 'plus',
  dailyCoach: 'unlimit',
  deepReview: 'unlimit',
  realPapers: 'unlimit',
  skillMap: 'unlimit',
  strategy: 'unlimit',
  weeklyReport: 'unlimit',
}

export function planIncludes(plan: PlanId, feature: Feature) {
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_PLAN[feature]]
}

/** Display names; the catalogue row for 'unlimit' is called Pro. */
export const PLAN_NAME: Record<PlanId, string> = { free: 'Free', plus: 'Plus', unlimit: 'Pro' }

export const PLAN_COPY: Record<PlanId, { tagline: string; audience?: string; items: string[] }> = {
  free: {
    tagline: 'Independent preparation',
    items: [
      'Unlimited AI requests during the launch',
      'Every open olympiad problem',
      'Hints and step-by-step explanations',
      'Checking your own solutions',
      'Simple statistics of solved problems',
    ],
  },
  plus: {
    tagline: 'Systematic olympiad preparation',
    items: [
      'Everything in Free',
      'A personal preparation plan',
      'An automatic mistake diary',
      'Adaptive problem sets on weak topics',
      'Detailed progress analytics',
      'Mock olympiads with a review of the results',
    ],
  },
  unlimit: {
    tagline: 'A personal AI coach',
    audience: 'For the ambitious',
    items: [
      'Everything in Plus',
      'An AI coach that adjusts your preparation every day',
      'In-depth review of your reasoning, not only the answers',
      'Olympiad simulation with a timer and grading',
      'A detailed map of skills and gaps',
      'A preparation strategy for a specific olympiad',
      'A weekly readiness report with recommendations',
    ],
  },
}

export const FEATURE_LABEL: Record<Feature, string> = {
  plan: 'A personal preparation plan',
  mistakes: 'An automatic mistake diary',
  weakSets: 'Adaptive problem sets on weak topics',
  analytics: 'Detailed progress analytics',
  mocks: 'Mock olympiads with a review of the results',
  dailyCoach: 'An AI coach that adjusts your preparation every day',
  deepReview: 'In-depth review of your reasoning, not only the answers',
  realPapers: 'Olympiad simulation with a timer and grading',
  skillMap: 'A detailed map of skills and gaps',
  strategy: 'A preparation strategy for a specific olympiad',
  weeklyReport: 'A weekly readiness report with recommendations',
}
