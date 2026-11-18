'use server'

import { revalidatePath } from 'next/cache'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { fileAppeal, parseLines, type Appeal, type AppealMode } from '@/lib/appeals'
import { getDb } from '@/lib/db'
import { getLocale, getT } from '@/lib/i18n/server'

export type AppealResult = { ok: true; appeal: Appeal } | { ok: false; error: string }

/** Appeals call the model like grading does, so they get a limit of their own. */
const APPEALS_PER_HOUR = 10

export async function submitAppeal(input: { attemptId: string; taskId: string; mode: AppealMode; criterion: string; lines: string; argument: string }): Promise<AppealResult> {
  const t = await getT()
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }
  if (!/^[0-9a-f-]{36}$/i.test(input.attemptId) || (input.mode !== 'practice' && input.mode !== 'dispute')) return { ok: false, error: t('Malformed request body.') }
  const argument = String(input.argument ?? '').trim()
  if (argument.length < 20) return { ok: false, error: t('Write the argument in at least a couple of sentences: which criterion, which lines, and why.') }

  const db = await getDb()
  const { rows } = await db.query<{ n: number }>(
    "select count(*)::int as n from public.grading_appeals where user_id = $1 and created_at > now() - interval '1 hour'",
    [user.id],
  )
  if ((rows[0]?.n ?? 0) >= APPEALS_PER_HOUR) return { ok: false, error: t('Too many appeals in an hour. Try again a little later.') }

  const locale = await getLocale()
  const result = await fileAppeal(user.id, {
    attemptId: input.attemptId,
    mode: input.mode,
    criterion: String(input.criterion ?? '').slice(0, 400),
    lines: parseLines(String(input.lines ?? '')),
    argument: argument.slice(0, 3000),
    language: locale === 'kk' ? 'kk' : locale === 'en' ? 'en' : 'ru',
  })
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error === 'already-disputed'
          ? t('This mark has already been disputed once. The appeal trainer is still open.')
          : result.error === 'not-found'
            ? t('That attempt was not found.')
            : t('The jury could not answer right now. Please try again.'),
    }
  }
  revalidatePath(`/tasks/${input.taskId}/attempts/${input.attemptId}`)
  revalidatePath(`/tasks/${input.taskId}`)
  return { ok: true, appeal: result.appeal }
}
