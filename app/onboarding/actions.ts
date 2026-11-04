'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAllowed, isOptional, type ProfileField } from '@/lib/profile-options'
import type { Database } from '@/lib/supabase/database.types'
import { getT } from '@/lib/i18n/server'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

const FIELDS = [
  'grade',
  'primary_subject',
  'level',
  'goal',
  'target_competition_type',
  'training_intensity',
] as const satisfies readonly ProfileField[]

export type OnboardingResult = { ok: boolean; error?: string }

/**
 * Completes onboarding.
 *
 * The flow used to write the profile straight from the browser with the
 * publishable key, so the values that later reach Sulu's system instructions
 * were whatever the client sent. They are validated against the option lists
 * here instead.
 *
 * Optional fields may arrive empty and are stored as null rather than rejected:
 * the step that asks about competitions is labelled optional, and until now the
 * Continue button stayed disabled anyway.
 */
export async function completeOnboarding(formData: FormData): Promise<OnboardingResult> {
  const t = await getT()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }

  const update: ProfileUpdate = {}
  for (const field of FIELDS) {
    const raw = formData.get(field)
    const value = typeof raw === 'string' ? raw.trim() : ''

    if (!value) {
      if (isOptional(field)) {
        update[field] = null
        continue
      }
      return { ok: false, error: t('Please choose an option for "{n}".', { n: field.replace(/_/g, ' ') }) }
    }
    if (!isAllowed(field, value)) {
      return { ok: false, error: t('That choice is not one of the available options.') }
    }
    update[field] = value
  }

  const { error } = await supabase
    .from('profiles')
    .update({ ...update, onboarding_completed_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) return { ok: false, error: t('Unable to save your setup. Please try again.') }

  // Back to wherever they were going, validated rather than trusted: it
  // arrives in a form field.
  const next = String(formData.get('next') ?? '')
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')
}
