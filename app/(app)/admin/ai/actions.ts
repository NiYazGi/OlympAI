'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminAction, type AdminResult } from '@/lib/supabase/admin-guard'
import { logAdmin } from '@/lib/admin/log'
import { EFFORTS, type Effort, deleteProfile, listProfiles, resolveActiveProfile, resolveProfile, saveProfile, setActiveProfile, type ProfileInput } from '@/lib/ai/profiles'
import { PROMPT_KEYS, savePrompt, type PromptKey } from '@/lib/ai/prompts'
import { pingProfile, SuluError } from '@/lib/sulu/provider'
import { getT } from '@/lib/i18n/server'

function done() {
  revalidatePath('/admin/ai')
}

function readProfile(formData: FormData): ProfileInput | string {
  const text = (key: string, max: number) => {
    const value = formData.get(key)
    return typeof value === 'string' ? value.trim().slice(0, max) : ''
  }
  const name = text('name', 80)
  const baseUrl = text('base_url', 300).replace(/\/+$/, '')
  if (!name) return 'Give the profile a name.'
  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    return 'The API address must be a full https:// URL.'
  }
  if (url.protocol !== 'https:') return 'The API address must be a full https:// URL.'
  const timeout = Number(text('timeout', 4))
  return {
    name,
    baseUrl,
    model: text('model', 120) || null,
    apiKey: text('api_key', 400) || null,
    strictJson: formData.get('strict_json') === 'on',
    timeoutSeconds: Number.isFinite(timeout) ? Math.max(10, Math.min(600, Math.round(timeout))) : 60,
    reasoningEffort: (EFFORTS as readonly string[]).includes(text('effort', 10)) ? (text('effort', 10) as Effort) : null,
    reasoningEffortFast: (EFFORTS as readonly string[]).includes(text('effort_fast', 10)) ? (text('effort_fast', 10) as Effort) : null,
  }
}

export async function saveAiProfile(id: string | null, formData: FormData): Promise<AdminResult & { id?: string }> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const input = readProfile(formData)
  if (typeof input === 'string') return { ok: false, error: t(input) }
  if (!id && !input.apiKey) return { ok: false, error: t('A new profile needs an API key.') }
  try {
    const saved = await saveProfile(id, input)
    await logAdmin(gate.admin, gate.userId, id ? 'ai.profile.update' : 'ai.profile.create', saved, { name: input.name, model: input.model, key_changed: Boolean(input.apiKey) })
    done()
    return { ok: true, id: saved, message: t('Profile saved.') }
  } catch (cause) {
    const message = cause instanceof Error && cause.message.includes('AI_SECRET') ? 'Keys cannot be stored: AI_SECRET is not set on the server.' : 'The profile could not be saved.'
    return { ok: false, error: t(message) }
  }
}

export async function removeAiProfile(id: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const active = await resolveActiveProfile()
  if (active.id === id) return { ok: false, error: t('Switch to another profile before deleting this one.') }
  await deleteProfile(id)
  await logAdmin(gate.admin, gate.userId, 'ai.profile.delete', id)
  done()
  return { ok: true, message: t('Profile deleted.') }
}

export async function switchAiProfile(id: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const target = (await listProfiles()).find((profile) => profile.id === id)
  if (!target) return { ok: false, error: t('That profile no longer exists.') }
  if (target.keySource === 'missing') return { ok: false, error: t('This profile has no API key, so it cannot be switched on.') }
  await setActiveProfile(id, gate.userId)
  await logAdmin(gate.admin, gate.userId, 'ai.profile.switch', id, { name: target.name })
  done()
  return { ok: true, message: t('All AI tasks now use “{name}”.', { name: target.name }) }
}

/** One tiny request through a profile, active or not. */
export async function testAiProfile(id: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  const target = await resolveProfile(id)
  if (!target) return { ok: false, error: t('That profile no longer exists.') }
  if (!target.key) return { ok: false, error: t('This profile has no API key.') }
  try {
    const result = await pingProfile({ ...target, key: target.key })
    return { ok: true, message: t('Answered in {s} s: “{text}”.', { s: (result.ms / 1000).toFixed(1), text: result.text || '—' }) }
  } catch (cause) {
    return { ok: false, error: cause instanceof SuluError ? t(cause.message) : t('No answer.') }
  }
}

export async function saveAiPrompt(key: string, text: string): Promise<AdminResult> {
  const t = await getT()
  const gate = await requireAdminAction()
  if (!gate.ok) return gate
  if (!PROMPT_KEYS.includes(key as PromptKey)) return { ok: false, error: t('Unknown task.') }
  if (text.length > 20_000) return { ok: false, error: t('The prompt is too long.') }
  await savePrompt(key as PromptKey, text, gate.userId)
  await logAdmin(gate.admin, gate.userId, 'ai.prompt', key, { length: text.trim().length })
  done()
  return { ok: true, message: text.trim() ? t('Prompt saved. It applies from the next request.') : t('Default prompt restored.') }
}
