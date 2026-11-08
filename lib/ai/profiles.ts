import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { getDb } from '@/lib/db'

/**
 * Where model requests go. The admin panel lists the profiles and picks the
 * active one; every AI task (chat, hints, grading, photo reading, card drafts)
 * uses whichever is active at the time of the request.
 */
export type AiProfile = {
  id: string
  name: string
  baseUrl: string
  /** Null means the server's SULU_MODEL, or the default. */
  model: string | null
  keyEnv: string | null
  strictJson: boolean
  timeoutSeconds: number
  reasoningEffort: Effort | null
  reasoningEffortFast: Effort | null
  builtIn: boolean
  /** Where the key comes from, for the admin panel. Never the key itself. */
  keySource: 'env' | 'stored' | 'missing'
  keyHint: string | null
}

type Row = {
  id: string
  name: string
  base_url: string
  model: string | null
  key_env: string | null
  api_key_enc: string | null
  strict_json: boolean
  timeout_seconds: number
  reasoning_effort: Effort | null
  reasoning_effort_fast: Effort | null
  built_in: boolean
}

export const EFFORTS = ['none', 'low', 'medium', 'high'] as const
export type Effort = (typeof EFFORTS)[number]

export const DEFAULT_MODEL = 'gpt-5.4-mini'

function secret() {
  const value = process.env.AI_SECRET
  return value ? createHash('sha256').update(value).digest() : null
}

/** AES-256-GCM with the server's AI_SECRET, so a copied database does not leak the keys. */
export function encryptKey(plain: string) {
  const key = secret()
  if (!key) throw new Error('AI_SECRET is not set on the server.')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), body.toString('base64')].join(':')
}

function decryptKey(stored: string) {
  const key = secret()
  if (!key) return null
  try {
    const [version, iv, tag, body] = stored.split(':')
    if (version !== 'v1' || !iv || !tag || !body) return null
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

function keyOf(row: Row) {
  if (row.api_key_enc) return decryptKey(row.api_key_enc)
  if (row.key_env) return process.env[row.key_env] || null
  return null
}

function toProfile(row: Row): AiProfile {
  const key = keyOf(row)
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.base_url,
    model: row.model,
    keyEnv: row.key_env,
    strictJson: row.strict_json,
    timeoutSeconds: row.timeout_seconds,
    reasoningEffort: row.reasoning_effort,
    reasoningEffortFast: row.reasoning_effort_fast,
    builtIn: row.built_in,
    keySource: !key ? 'missing' : row.api_key_enc ? 'stored' : 'env',
    keyHint: key ? `…${key.slice(-4)}` : null,
  }
}

export async function listProfiles(): Promise<AiProfile[]> {
  const db = await getDb()
  const { rows } = await db.query<Row>('select * from public.ai_profiles order by built_in desc, created_at')
  return rows.map(toProfile)
}

export async function activeProfileId(): Promise<string> {
  const db = await getDb()
  const { rows } = await db.query<{ value: { id?: string } }>("select value from public.site_settings where key = 'ai_profile'")
  return rows[0]?.value?.id || 'primary'
}

export type ResolvedProfile = { id: string; name: string; baseUrl: string; model: string; key: string | null; strictJson: boolean; timeoutMs: number; effort: Effort | null; effortFast: Effort | null }

function resolved(row: Row): ResolvedProfile {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.base_url.replace(/\/+$/, ''),
    model: row.model || process.env.SULU_MODEL || DEFAULT_MODEL,
    key: keyOf(row),
    strictJson: row.strict_json,
    timeoutMs: row.timeout_seconds * 1000,
    effort: row.reasoning_effort,
    effortFast: row.reasoning_effort_fast,
  }
}

/** One profile by id, with its key, whether or not it is active (for the admin panel's test). */
export async function resolveProfile(id: string): Promise<ResolvedProfile | null> {
  const db = await getDb()
  const { rows } = await db.query<Row>('select * from public.ai_profiles where id = $1', [id])
  return rows[0] ? resolved(rows[0]) : null
}

/** The profile a request goes to, with its key. Falls back to the server env when the table is unavailable. */
export async function resolveActiveProfile(): Promise<ResolvedProfile> {
  try {
    const db = await getDb()
    const id = await activeProfileId()
    const { rows } = await db.query<Row>(
      "select * from public.ai_profiles where id = $1 or id = 'primary' order by (id = $1) desc limit 1",
      [id],
    )
    if (rows[0]) return resolved(rows[0])
  } catch (cause) {
    console.error('[ai-profile] falling back to the server env:', cause)
  }
  return {
    id: 'primary',
    name: 'primary',
    baseUrl: 'https://api.openai.com/v1',
    model: process.env.SULU_MODEL || DEFAULT_MODEL,
    key: process.env.OPENAI_API_KEY || null,
    strictJson: true,
    timeoutMs: 60_000,
    effort: null,
    effortFast: null,
  }
}

export type ProfileInput = {
  name: string
  baseUrl: string
  model: string | null
  apiKey: string | null
  strictJson: boolean
  timeoutSeconds: number
  reasoningEffort: Effort | null
  reasoningEffortFast: Effort | null
}

/** A new key replaces the stored one; leaving it empty keeps whatever the profile had. */
export async function saveProfile(id: string | null, input: ProfileInput) {
  const db = await getDb()
  const enc = input.apiKey ? encryptKey(input.apiKey) : null
  if (!id) {
    const newId = `p-${randomBytes(4).toString('hex')}`
    await db.query(
      `insert into public.ai_profiles (id, name, base_url, model, api_key_enc, strict_json, timeout_seconds, reasoning_effort, reasoning_effort_fast)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [newId, input.name, input.baseUrl, input.model, enc, input.strictJson, input.timeoutSeconds, input.reasoningEffort, input.reasoningEffortFast],
    )
    return newId
  }
  await db.query(
    `update public.ai_profiles set name = $2, base_url = $3, model = $4, strict_json = $5, timeout_seconds = $6,
       api_key_enc = coalesce($7, api_key_enc), reasoning_effort = $8, reasoning_effort_fast = $9, updated_at = now() where id = $1`,
    [id, input.name, input.baseUrl, input.model, input.strictJson, input.timeoutSeconds, enc, input.reasoningEffort, input.reasoningEffortFast],
  )
  return id
}

export async function deleteProfile(id: string) {
  const db = await getDb()
  await db.query('delete from public.ai_profiles where id = $1 and not built_in', [id])
}

export async function setActiveProfile(id: string, adminId: string) {
  const db = await getDb()
  await db.query(
    `insert into public.site_settings (key, value, updated_at, updated_by) values ('ai_profile', $1::jsonb, now(), $2)
     on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`,
    [JSON.stringify({ id }), adminId],
  )
}
