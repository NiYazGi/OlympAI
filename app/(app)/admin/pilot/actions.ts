'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminAction, type AdminResult } from '@/lib/supabase/admin-guard'
import { logAdmin } from '@/lib/admin/log'
import { setCohort } from '@/lib/pilot'
import { getT } from '@/lib/i18n/server'

export async function assignCohort(list: string, cohort: 'pilot' | 'control' | 'none'): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  if (!['pilot', 'control', 'none'].includes(cohort)) return { ok: false, error: t('Malformed request body.') }
  const identifiers = String(list ?? '').split(/[\s,;]+/)
  const { matched } = await setCohort(identifiers, cohort === 'none' ? null : cohort)
  await logAdmin(gate.admin, gate.userId, 'pilot.assign', null, { cohort, matched })
  revalidatePath('/admin/pilot')
  return { ok: true, message: t('{n} accounts updated.', { n: matched }) }
}
