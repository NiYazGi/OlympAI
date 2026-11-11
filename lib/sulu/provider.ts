import 'server-only'

import type { ModelImage } from '@/lib/sulu/images'
import { resolveActiveProfile, type ResolvedProfile } from '@/lib/ai/profiles'
import { IDENTITY_GUARD } from '@/lib/ai/prompts'

export type SuluMessage = { role: 'user' | 'assistant'; content: string }
export type SuluUsage = { input: number; cached: number; output: number }

/**
 * Every model request goes through here, to whichever API profile the admin
 * panel has made active. Profiles speak the Responses API; one that cannot
 * enforce a JSON schema gets the schema described in the prompt instead, and
 * its reply is checked and asked for once more if it does not fit.
 */

export class SuluError extends Error {
  readonly status: number
  constructor(message: string, status = 502) {
    super(message)
    this.name = 'SuluError'
    this.status = status
  }
}

/** Every instruction ends with the identity rule, whatever prompt the admin wrote. */
function guarded(instructions: string) {
  // Stated first as well as last: a model reads the opening as who it is.
  return `You are Sulu AI, the assistant of OlympAI. You never disclose the model, vendor or API behind you.\n\n${instructions}${IDENTITY_GUARD}`
}

async function profile(): Promise<ResolvedProfile & { key: string }> {
  const active = await resolveActiveProfile()
  if (!active.key) {
    throw new SuluError('Sulu AI is not configured on this server. This needs an administrator.', 503)
  }
  return active as ResolvedProfile & { key: string }
}

/** `fast` is for tasks a student is waiting on (hints, grading, photo reading): the profile's quick reasoning setting. */
async function post(active: ResolvedProfile & { key: string }, body: Record<string, unknown>, fast = false) {
  const effort = fast ? active.effortFast : active.effort
  let response: Response
  try {
    response = await fetch(`${active.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${active.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: active.model, ...(effort ? { reasoning: { effort } } : {}), ...body }),
      signal: AbortSignal.timeout(active.timeoutMs),
    })
  } catch (cause) {
    if (cause instanceof Error && (cause.name === 'TimeoutError' || cause.name === 'AbortError')) {
      throw new SuluError('Sulu AI took too long to answer. Try again in a moment.', 504)
    }
    throw new SuluError('Sulu AI could not be reached. Try again in a moment.', 502)
  }

  if (!response.ok) {
    throw await providerError(response)
  }

  return response
}

/**
 * Turns a provider failure into a message that says something true, without
 * naming the provider or the model: students see these.
 *
 * Only the machine-readable `type` and `code` are read from the body. The
 * provider's `message` is deliberately ignored: it can echo the request back,
 * and for grading the request carries the reference solution.
 */
async function providerError(response: Response) {
  let type = ''
  let code = ''
  try {
    const body = (await response.json()) as { error?: { type?: string; code?: string } }
    type = typeof body.error?.type === 'string' ? body.error.type : ''
    code = typeof body.error?.code === 'string' ? body.error.code : ''
  } catch {
    // A non-JSON error body tells us nothing; fall through to the status code.
  }

  if (type === 'insufficient_quota' || code === 'credit_balance_exhausted') {
    return new SuluError('Sulu AI is unavailable: the AI account is out of credit. This needs an administrator, not a retry.', 503)
  }
  if (response.status === 401 || response.status === 403) {
    return new SuluError('Sulu AI is not configured correctly on this server. This needs an administrator.', 503)
  }
  if (response.status === 429) {
    return new SuluError('Sulu AI is busy right now. Try again in a moment.', 429)
  }
  if (response.status >= 500) {
    return new SuluError('Sulu AI is temporarily unavailable. Try again in a moment.', 502)
  }
  if (response.status === 404 || code === 'model_not_found' || response.status === 400 || type === 'invalid_request_error') {
    return new SuluError('Sulu AI is misconfigured on this server. This needs an administrator, not a retry.', 503)
  }
  return new SuluError('Sulu AI could not be reached. Try again in a moment.', 502)
}

function readUsage(usage: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number } } | undefined): SuluUsage {
  return {
    input: usage?.input_tokens ?? 0,
    cached: usage?.input_tokens_details?.cached_tokens ?? 0,
    output: usage?.output_tokens ?? 0,
  }
}

/** Streaming coach turn. Returns the raw SSE body for the caller to parse, and the model it went to. */
export async function streamSuluResponse(instructions: string, history: SuluMessage[]) {
  const active = await profile()
  const response = await post(active, {
    instructions: guarded(instructions),
    input: history.map((message) => ({ role: message.role, content: message.content })),
    stream: true,
  })
  if (!response.body) throw new SuluError('Sulu AI returned an empty response.')
  return { body: response.body, model: active.model }
}

export async function requestSuluJson<T>(
  instructions: string,
  input: string,
  schema: { name: string; schema: Record<string, unknown> },
  images: ModelImage[] = [],
  options: { fast?: boolean } = {},
): Promise<T> {
  return (await requestSuluJsonWithUsage<T>(instructions, input, schema, images, options)).data
}

/** The first complete JSON object in a reply that may carry prose or a code fence around it. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const source = fenced ? fenced[1]! : text
  const start = source.indexOf('{')
  if (start === -1) throw new Error('no object')
  let depth = 0
  let inString = false
  for (let i = start; i < source.length; i++) {
    const ch = source[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) return JSON.parse(source.slice(start, i + 1))
  }
  throw new Error('unterminated object')
}

/** Checks the shape a schema asks for, deeply enough to catch a reply that does not fit. */
export function fitsSchema(value: unknown, schema: Record<string, unknown>): boolean {
  if (schema.anyOf) return (schema.anyOf as Record<string, unknown>[]).some((option) => fitsSchema(value, option))
  const types = Array.isArray(schema.type) ? (schema.type as string[]) : schema.type ? [schema.type as string] : []
  const typeOk = (type: string) => {
    switch (type) {
      case 'null':
        return value === null
      case 'string':
        return typeof value === 'string'
      case 'boolean':
        return typeof value === 'boolean'
      case 'integer':
        return Number.isInteger(value)
      case 'number':
        return typeof value === 'number'
      case 'array':
        return Array.isArray(value)
      case 'object':
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
      default:
        return true
    }
  }
  if (types.length && !types.some(typeOk)) return false
  if (schema.enum && !(schema.enum as unknown[]).includes(value)) return false
  if (Array.isArray(value) && schema.items) return value.every((item) => fitsSchema(item, schema.items as Record<string, unknown>))
  if (value && typeof value === 'object' && !Array.isArray(value) && schema.properties) {
    const record = value as Record<string, unknown>
    for (const key of (schema.required as string[] | undefined) ?? []) if (!(key in record)) return false
    for (const [key, sub] of Object.entries(schema.properties as Record<string, Record<string, unknown>>)) {
      if (key in record && !fitsSchema(record[key], sub)) return false
    }
  }
  return true
}

function outputText(payload: { output_text?: string; output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> }) {
  return (
    payload.output_text ??
    (payload.output ?? [])
      .filter((item) => !item.type || item.type === 'message')
      .flatMap((item) => item.content ?? [])
      .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('')
  )
}

/** The same call, also returning the tokens it cost and the model it went to, for the usage ledger. */
export async function requestSuluJsonWithUsage<T>(
  instructions: string,
  input: string,
  schema: { name: string; schema: Record<string, unknown> },
  images: ModelImage[] = [],
  options: { fast?: boolean } = {},
): Promise<{ data: T; usage: SuluUsage; model: string }> {
  const active = await profile()
  const fast = Boolean(options.fast)
  const content = (text: string) =>
    images.length ? [{ role: 'user', content: [{ type: 'input_text', text }, ...images] }] : text

  if (active.strictJson) {
    // An enforced schema still occasionally comes back cut short or empty.
    // One quiet retry turns that into a slower answer instead of an error the
    // student has to retype their question for.
    const total: SuluUsage = { input: 0, cached: 0, output: 0 }
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await post(active, {
        instructions: guarded(instructions),
        input: content(input),
        text: { format: { type: 'json_schema', name: schema.name, schema: schema.schema, strict: true } },
      }, fast)
      const payload = await response.json()
      const usage = readUsage(payload.usage)
      total.input += usage.input
      total.cached += usage.cached
      total.output += usage.output
      const text = outputText(payload)
      if (!text) continue
      try {
        const data = JSON.parse(text)
        if (fitsSchema(data, schema.schema)) return { data: data as T, usage: total, model: active.model }
      } catch {
        // fall through to the retry
      }
    }
    throw new SuluError('Sulu AI returned a malformed response.')
  }

  // No enforced schema: describe it, check the reply, and ask once more if it does not fit.
  const described = `${instructions}

Output format: reply with exactly one JSON object and nothing else — no prose, no code fence. It must match this JSON Schema (every listed property present, nothing extra):
${JSON.stringify(schema.schema)}`
  const total: SuluUsage = { input: 0, cached: 0, output: 0 }
  let request = input
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await post(active, { instructions: guarded(described), input: content(request) }, fast)
    const payload = await response.json()
    const usage = readUsage(payload.usage)
    total.input += usage.input
    total.cached += usage.cached
    total.output += usage.output
    const text = outputText(payload) ?? ''
    try {
      const data = extractJson(text)
      if (fitsSchema(data, schema.schema)) return { data: data as T, usage: total, model: active.model }
    } catch {
      // fall through to the retry
    }
    request = `${input}

Your previous reply was not a valid JSON object matching the schema. Reply again with only the JSON object.`
  }
  throw new SuluError('Sulu AI returned a malformed response.')
}

/** A short request to see whether a profile answers, for the admin panel. Throws SuluError on failure. */
export async function pingProfile(target: ResolvedProfile & { key: string }) {
  const started = Date.now()
  const response = await post(target, {
    instructions: guarded('Reply with the single word OK.'),
    input: 'ping',
  }, true)
  const payload = await response.json()
  return { ms: Date.now() - started, text: (outputText(payload) ?? '').trim().slice(0, 80), usage: readUsage(payload.usage) }
}
