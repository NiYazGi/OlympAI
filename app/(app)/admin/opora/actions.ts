'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminAction, type AdminResult } from '@/lib/supabase/admin-guard'
import { logAdmin } from '@/lib/admin/log'
import { draftCard, saveCard, type CardInput } from '@/lib/opora/cards'
import { getDb } from '@/lib/db'
import { SuluError } from '@/lib/sulu/provider'
import { getT } from '@/lib/i18n/server'

function text(formData: FormData, key: string, max = 4000) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function lines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** "mistake → fix" per line. */
function mistakes(value: string) {
  return lines(value).map((line) => {
    const [mistake, ...fix] = line.split('→')
    return { mistake: mistake!.trim(), fix: fix.join('→').trim() }
  })
}

export async function saveTaskCard(taskId: string, formData: FormData): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate

  const card: CardInput = {
    finalAnswer: text(formData, 'final_answer', 1000) || null,
    notation: text(formData, 'notation') || null,
    assumptions: text(formData, 'assumptions') || null,
    keySteps: lines(text(formData, 'key_steps', 8000)).slice(0, 12),
    mistakes: mistakes(text(formData, 'mistakes', 6000)).slice(0, 10),
    hints: {
      nudge: text(formData, 'hint_nudge', 1500) || undefined,
      idea: text(formData, 'hint_idea', 1500) || undefined,
      step: text(formData, 'hint_step', 1500) || undefined,
      check: text(formData, 'hint_check', 1500) || undefined,
    },
    needsFigure: formData.get('needs_figure') === 'on',
  }
  const verified = formData.get('verified') === 'on'
  await saveCard(taskId, card, verified ? gate.userId : null)
  await logAdmin(gate.admin, gate.userId, verified ? 'card.verify' : 'card.save', taskId)
  revalidatePath(`/admin/tasks/${taskId}`)
  revalidatePath('/admin/opora')
  return { ok: true, message: verified ? t('Card saved and verified. Its ready hints are now shown without the model.') : t('Card saved as a draft.') }
}

export async function generateTaskCard(taskId: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  try {
    await draftCard(taskId, gate.userId)
  } catch (cause) {
    return { ok: false, error: cause instanceof SuluError ? cause.message : t('The draft could not be generated.') }
  }
  await logAdmin(gate.admin, gate.userId, 'card.generate', taskId)
  revalidatePath(`/admin/tasks/${taskId}`)
  revalidatePath('/admin/opora')
  return { ok: true, message: t('Draft card generated. Check it, correct it and mark it verified.') }
}

/** Drafts cards for the problems students actually open, most-asked first. */
export async function generateCardsBatch(count: number): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const db = await getDb()
  const { rows } = await db.query<{ id: string }>(
    `select tk.id from public.tasks tk
       left join public.task_cards c on c.task_id = tk.id
       left join (select task_id, count(*) n from public.chat_sessions where task_id is not null group by task_id) s on s.task_id = tk.id
       left join (select task_id, count(*) n from public.task_attempts group by task_id) a on a.task_id = tk.id
      where c.task_id is null and tk.class_id is null and not tk.hidden
      order by coalesce(s.n, 0) desc, coalesce(a.n, 0) desc, tk.official_solution is null, tk.id
      limit $1`,
    [Math.max(1, Math.min(10, Math.round(count)))],
  )
  let done = 0
  for (const row of rows) {
    try {
      await draftCard(row.id, gate.userId)
      done += 1
    } catch (cause) {
      if (cause instanceof SuluError && done === 0) return { ok: false, error: t(cause.message) }
      break
    }
  }
  await logAdmin(gate.admin, gate.userId, 'card.generate', null, { count: done })
  revalidatePath('/admin/opora')
  return { ok: true, message: t('{n} draft {n|card|cards} generated.', { n: done }) }
}
