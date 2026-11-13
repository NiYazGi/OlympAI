'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminAction } from '@/lib/supabase/admin-guard'
import { logAdmin } from '@/lib/admin/log'
import { issueDocument } from '@/lib/documents/store'
import { cleanData, templateById } from '@/lib/documents/templates'
import { getT } from '@/lib/i18n/server'

export type IssueResult = { ok: true; id: string; number: string } | { ok: false; error: string }

/** Gives the document its outgoing number and keeps it in the registry. */
export async function issue(kind: string, input: Record<string, unknown>): Promise<IssueResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return { ok: false, error: gate.error }
  const template = templateById(kind)
  if (!template) return { ok: false, error: t('Malformed request body.') }
  const data = cleanData(template, input)
  if (!data.signer.trim()) return { ok: false, error: t('Fill in the full name of the signer.') }
  try {
    const document = await issueDocument(template.id, template.prefix, data.subject.trim() || t(template.title), data, gate.userId)
    await logAdmin(gate.admin, gate.userId, 'document.issue', document.id, { kind: template.id, number: document.number })
    revalidatePath('/documents')
    return { ok: true, id: document.id, number: document.number }
  } catch {
    return { ok: false, error: t('That did not save. Please try again.') }
  }
}
