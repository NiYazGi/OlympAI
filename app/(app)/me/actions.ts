'use server'

import { revalidatePath } from 'next/cache'
import sharp from 'sharp'
import { getSessionUserId } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { isAllowed, type ProfileField } from '@/lib/profile-options'
import type { Database } from '@/lib/supabase/database.types'
import { getT } from '@/lib/i18n/server'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type PreferencesResult = { ok: boolean; error?: string }

export async function saveProfileAvatar(formData: FormData): Promise<PreferencesResult> {
  const [t, userId] = await Promise.all([getT(), getSessionUserId()])
  if (!userId) return { ok: false, error: t('Your session has expired. Please log in again.') }

  const file = formData.get('avatar')
  const invalid = t('Choose a valid JPEG, PNG or WebP image.')
  if (!(file instanceof File) || !file.size || file.size > 300 * 1024) {
    return { ok: false, error: invalid }
  }

  let webp: Buffer
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 1_000_000 })
    const { format } = await image.metadata()
    if (format !== 'jpeg' && format !== 'png' && format !== 'webp') return { ok: false, error: invalid }
    webp = await image.rotate().resize(256, 256).webp({ quality: 82 }).toBuffer()
  } catch {
    return { ok: false, error: invalid }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('profile_avatars').upsert({
    user_id: userId,
    webp_base64: webp.toString('base64'),
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: t('The profile photo could not be saved. Try again.') }

  revalidatePath('/(app)', 'layout')
  return { ok: true }
}

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
  const t = await getT()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }

  const fields = ['primary_subject', 'level', 'goal', 'training_intensity'] as const
  const update: ProfileUpdate = {}
  for (const field of fields satisfies readonly ProfileField[]) {
    const value = formData.get(field)
    if (!isAllowed(field, value)) {
      return { ok: false, error: t('Please choose one option in each section.') }
    }
    update[field] = value
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
  if (error) return { ok: false, error: t('Your preferences could not be saved. Please try again.') }

  revalidatePath('/me')
  revalidatePath('/path')
  revalidatePath('/dashboard')
  revalidatePath('/plan')
  return { ok: true }
}
