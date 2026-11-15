'use server'

import { revalidatePath } from 'next/cache'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { startDiagnosticRetake, submitDiagnostic, updateDiagnosticAnswer } from '@/lib/supabase/diagnostic'
import type { Assistance } from '@/lib/diagnostic'

export async function recordDiagnosticAnswer(runId: string, questionId: string, choice: number) {
  if (!await getVerifiedUser()) return { ok: false, error: 'Войди в аккаунт, чтобы сохранить диагностику.' }
  return updateDiagnosticAnswer(runId, questionId, choice)
}

export async function revealDiagnosticHint(runId: string, questionId: string) {
  if (!await getVerifiedUser()) return { ok: false, error: 'Войди в аккаунт, чтобы продолжить диагностику.' }
  return updateDiagnosticAnswer(runId, questionId, null, true)
}

export async function finishDiagnostic(runId: string, assistance: Assistance, note: string) {
  if (!await getVerifiedUser()) return { ok: false, error: 'Войди в аккаунт, чтобы сохранить результат.' }
  const result = await submitDiagnostic(runId, { assistance, note })
  if (result.ok) {
    revalidatePath('/diagnostic')
    revalidatePath('/dashboard')
    revalidatePath('/plan')
    revalidatePath('/plan/calendar')
  }
  return result
}

export async function retakeDiagnostic() {
  if (!await getVerifiedUser()) return
  const result = await startDiagnosticRetake()
  if (result.ok) {
    revalidatePath('/diagnostic')
    revalidatePath('/dashboard')
    revalidatePath('/plan')
  }
}
