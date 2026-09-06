import 'server-only'

export type SuluMessage = { role: 'user' | 'assistant'; content: string }

export const SULU_MODEL = process.env.SULU_MODEL ?? 'gpt-5.4-mini'

const ENDPOINT = 'https://api.openai.com/v1/responses'
const REQUEST_TIMEOUT_MS = 60_000

export class SuluError extends Error {
  readonly status: number
  constructor(message: string, status = 502) {
    super(message)
    this.name = 'SuluError'
    this.status = status
  }
}

function apiKey() {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new SuluError(
      'Sulu AI is not configured. Add OPENAI_API_KEY on the server.',
      503,
    )
  }
  return key
}

async function post(body: unknown) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw await providerError(response)
  }

  return response
}

/**
 * Turns a provider failure into a message that says something true.
 *
 * Only the machine-readable `type` and `code` are read from the body. The
 * provider's `message` is deliberately ignored: it can echo the request back,
 * and for grading the request carries the reference solution.
 *
 * The distinction matters. An exhausted credit balance also arrives as HTTP
 * 429, and telling a student to "try again in a moment" sends them round a
 * loop that cannot succeed — the fix is on the account, not in the retry.
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
    return new SuluError(
      'Sulu AI is unavailable: the project\'s model account is out of credit. This needs an administrator, not a retry.',
      503,
    )
  }

  if (response.status === 401 || response.status === 403) {
    return new SuluError(
      'Sulu AI is not configured correctly on this server. The model provider rejected the credentials.',
      503,
    )
  }

  if (response.status === 429) {
    return new SuluError('Sulu AI is busy right now. Try again in a moment.', 429)
  }

  if (response.status >= 500) {
    return new SuluError('Sulu AI is temporarily unavailable. Try again in a moment.', 502)
  }

  return new SuluError('Sulu AI could not be reached. Try again in a moment.', 502)
}

/** Streaming coach turn. Returns the raw SSE body for the caller to parse. */
export async function streamSuluResponse(
  instructions: string,
  history: SuluMessage[],
) {
  const response = await post({
    model: SULU_MODEL,
    instructions,
    input: history.map((message) => ({ role: message.role, content: message.content })),
    stream: true,
  })

  if (!response.body) throw new SuluError('Sulu AI returned an empty response.')
  return response.body
}

/**
 * Non-streaming call constrained to a JSON schema. Used by the grader, where a
 * free-text answer would have to be parsed heuristically — which is how the
 * previous keyword-matching evaluator came about in the first place.
 */
export async function requestSuluJson<T>(
  instructions: string,
  input: string,
  schema: { name: string; schema: Record<string, unknown> },
): Promise<T> {
  const response = await post({
    model: SULU_MODEL,
    instructions,
    input,
    text: {
      format: {
        type: 'json_schema',
        name: schema.name,
        schema: schema.schema,
        strict: true,
      },
    },
  })

  const payload = (await response.json()) as {
    output_text?: string
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  }

  const text =
    payload.output_text ??
    (payload.output ?? [])
      .flatMap((item) => item.content ?? [])
      .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('')

  if (!text) throw new SuluError('Sulu AI returned an empty response.')

  try {
    return JSON.parse(text) as T
  } catch {
    throw new SuluError('Sulu AI returned a malformed response.')
  }
}
