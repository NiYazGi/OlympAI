'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type RegistrationResult = { ok: boolean; error?: string }

/**
 * Registration is a real row now. The button used to be a `<Button>` with no
 * onClick next to a hard-coded "Registered" badge.
 */
export async function setRegistration(
  competitionId: string,
  registered: boolean,
): Promise<RegistrationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }

  const { data: competition } = await supabase
    .from('competitions')
    .select('id')
    .eq('id', competitionId)
    .maybeSingle()
  if (!competition) return { ok: false, error: 'This competition is no longer listed.' }

  const { error } = registered
    ? await supabase
        .from('competition_registrations')
        .upsert({ user_id: user.id, competition_id: competition.id })
    : await supabase
        .from('competition_registrations')
        .delete()
        .eq('user_id', user.id)
        .eq('competition_id', competition.id)

  if (error) return { ok: false, error: 'That did not go through. Please try again.' }

  revalidatePath('/olympiads')
  return { ok: true }
}
