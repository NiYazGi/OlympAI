'use server'

import { revalidatePath } from 'next/cache'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { MISTAKE_REASONS, reviewMistake, type MistakeReason } from '@/lib/mistakes'
import { getTaskCatalogue } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n/server'

export type MistakeResult = { ok: true; retestTaskId: string | null } | { ok: false; error: string }

export async function submitReview(entryId: string, reason: string, note: string): Promise<MistakeResult> {
  const t = await getT()
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }
  if (!/^[0-9a-f-]{36}$/i.test(entryId) || !(MISTAKE_REASONS as readonly string[]).includes(reason)) return { ok: false, error: t('Malformed request body.') }
  const clean = typeof note === 'string' ? note.trim() : ''
  if (clean.length < 10) return { ok: false, error: t('Write in a sentence what went wrong and what the right step is.') }
  const retest = await reviewMistake(user.id, entryId, reason as MistakeReason, clean, await getTaskCatalogue())
  revalidatePath('/mistakes')
  return { ok: true, retestTaskId: retest }
}
