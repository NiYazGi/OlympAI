/**
 * A shared password in front of a whole deployment (the test site). Off unless
 * SITE_GATE_PASSWORD is set. Kept free of server-only imports: the proxy uses it.
 *
 * The cookie holds a hash of the password, not the password, so changing the
 * password on the server logs every visitor out of the gate.
 */
export const GATE_COOKIE = 'olympai-gate'

export function gatePassword(): string | null {
  const value = process.env.SITE_GATE_PASSWORD
  return value ? value : null
}

export async function gateToken(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`olympai-site-gate:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Only a same-site path survives as the place to return to. */
export function safeNext(value: unknown): string {
  const next = typeof value === 'string' ? value : ''
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') && !next.startsWith('/gate') ? next : '/'
}
