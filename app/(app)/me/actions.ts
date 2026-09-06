'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isAllowed, type ProfileField } from '@/lib/profile-options'
import type { Database } from '@/lib/supabase/database.types'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type PreferencesResult = { ok: boolean; error?: string }

/**
 * Persists the profile form.
 *
 * The panel it backs used to be pure local state: "Save preferences" flipped
 * the button label and wrote nothing, and the selections reset on reload.
 *
 * Values are checked against the closed option sets rather than stored as
 * free text, because `level` reaches the model's system instructions.
 */
export async function saveProfilePreferences(formData: FormData): Promise<PreferencesResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }

  const fields = ['primary_subject', 'level', 'goal', 'training_intensity'] as const
  const update: ProfileUpdate = {}
  for (const field of fields satisfies readonly ProfileField[]) {
    const value = formData.get(field)
    if (!isAllowed(field, value)) {
      return { ok: false, error: 'Please choose one option in each section.' }
    }
    update[field] = value
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
  if (error) return { ok: false, error: 'Your preferences could not be saved. Please try again.' }

  revalidatePath('/me')
  revalidatePath('/path')
  revalidatePath('/dashboard')
  return { ok: true }
}
