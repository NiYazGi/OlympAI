'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseSecretKey } from '@/lib/supabase/secret-env'
import { LICENCES, youTubeId, type Licence } from '@/lib/licence'

export type MaterialResult = { ok: boolean; error?: string; message?: string }

const KINDS = ['video', 'reading', 'reference'] as const
const MAX_TITLE = 200
const MAX_DESCRIPTION = 500
const MAX_ATTRIBUTION = 200

/**
 * Adds one piece of supplementary material.
 *
 * Written with the service role after an explicit admin check, because
 * resources are visible to every signed-in student: a table everyone reads
 * cannot be a table everyone writes. RLS alone could not express this — a
 * policy can say who is writing, not whether the licence has been established.
 */
export async function addMaterial(formData: FormData): Promise<MaterialResult> {
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }
  if (!hasSupabaseSecretKey()) {
    return { ok: false, error: 'Adding material is not configured on this server.' }
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) {
    return { ok: false, error: 'Only an administrator can add material.' }
  }

  const kind = String(formData.get('kind') ?? '')
  if (!(KINDS as readonly string[]).includes(kind)) {
    return { ok: false, error: 'Choose what kind of material this is.' }
  }

  const title = String(formData.get('title') ?? '').trim().slice(0, MAX_TITLE)
  if (!title) return { ok: false, error: 'Give it a title.' }

  const url = String(formData.get('url') ?? '').trim()
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, error: 'That is not a valid URL.' }
  }
  // Only http(s): a javascript: or data: link would be rendered as an anchor.
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'The link must start with http:// or https://.' }
  }
  if (kind === 'video' && !youTubeId(url)) {
    return {
      ok: false,
      error: 'Video links must be YouTube. Anything else can be added as a reference instead.',
    }
  }

  const licence = String(formData.get('licence') ?? '') as Licence
  if (!(licence in LICENCES)) return { ok: false, error: 'Choose a licence.' }
  if (licence === 'unknown') {
    return {
      ok: false,
      error:
        'Material with no recorded licence is not published. Find the terms first, or leave it out.',
    }
  }

  const attribution = String(formData.get('attribution') ?? '')
    .trim()
    .slice(0, MAX_ATTRIBUTION)
  if (LICENCES[licence].requiresAttribution && !attribution) {
    return {
      ok: false,
      error: `${LICENCES[licence].label} requires credit. Name the author or the source.`,
    }
  }

  const taskId = String(formData.get('task_id') ?? '').trim() || null
  const topicId = String(formData.get('topic_id') ?? '').trim() || null
  if (!taskId && !topicId) {
    return { ok: false, error: 'Attach it to a task or to a topic.' }
  }

  const admin = createAdminClient()
  if (taskId) {
    const { data: task } = await admin.from('tasks').select('id').eq('id', taskId).maybeSingle()
    if (!task) return { ok: false, error: 'That task does not exist.' }
  }
  if (topicId) {
    const { data: topic } = await admin.from('topics').select('id').eq('id', topicId).maybeSingle()
    if (!topic) return { ok: false, error: 'That topic does not exist.' }
  }

  const { error } = await admin.from('resources').insert({
    task_id: taskId,
    topic_id: taskId ? null : topicId,
    kind,
    title,
    url,
    description: String(formData.get('description') ?? '').trim().slice(0, MAX_DESCRIPTION) || null,
    licence,
    attribution: attribution || null,
    position: Number(formData.get('position') ?? 0) || 0,
  })
  if (error) {
    // The database trigger is the last word on licensing; surface what it said.
    return { ok: false, error: error.message }
  }

  if (taskId) revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/settings/material')
  return { ok: true, message: `Added “${title}”.` }
}

export async function removeMaterial(id: string): Promise<MaterialResult> {
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: 'Your session has expired. Please log in again.' }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) return { ok: false, error: 'Only an administrator can remove material.' }

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('resources')
    .select('task_id')
    .eq('id', id)
    .maybeSingle()
  const { error } = await admin.from('resources').delete().eq('id', id)
  if (error) return { ok: false, error: 'That could not be removed.' }

  if (row?.task_id) revalidatePath(`/tasks/${row.task_id}`)
  revalidatePath('/settings/material')
  return { ok: true, message: 'Removed.' }
}
