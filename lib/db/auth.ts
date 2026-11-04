import 'server-only'

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { getDb } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/db/password'
import type { Locale } from '@/lib/i18n/config'
import { codeLetter, MailError, sendMail, type CodePurpose } from '@/lib/mail'

/**
 * Accounts and sessions in the local database, replacing Supabase Auth.
 *
 * A session is 32 random bytes in an httpOnly cookie; the database keeps only
 * their SHA-256, so neither a leaked database file nor a log line is a live
 * session. Sessions last 30 days and are checked on every request — one
 * indexed lookup in-process, cheaper than verifying a JWT signature was.
 *
 * Returns the same `{ data, error }` shapes Supabase did, so callers did not
 * change.
 */

export const SESSION_COOKIE = 'olympai-session'
const SESSION_DAYS = 30

export type AuthUser = {
  id: string
  email: string
  user_metadata: Record<string, unknown>
  created_at: string
  last_sign_in_at: string | null
}

type AuthError = { message: string; status: number }
const fail = (message: string, status = 400) => ({ message, status }) satisfies AuthError

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

/**
 * Failed logins per account. Supabase Auth throttled sign-in attempts on its
 * side; without it, nothing stopped a script from trying passwords against an
 * account as fast as scrypt allows. After MAX_FAILURES wrong passwords in
 * FAILURE_WINDOW_MS the account refuses further attempts until the window
 * passes, whoever is asking — keyed by login, not IP, so rotating addresses
 * does not help. In memory, which is enough: there is one server process.
 */
const MAX_FAILURES = 10
const FAILURE_WINDOW_MS = 15 * 60 * 1000
const failures = new Map<string, { count: number; since: number }>()

function isThrottled(key: string) {
  const entry = failures.get(key)
  if (!entry) return false
  if (Date.now() - entry.since > FAILURE_WINDOW_MS) {
    failures.delete(key)
    return false
  }
  return entry.count >= MAX_FAILURES
}

function recordFailure(key: string) {
  const entry = failures.get(key)
  if (!entry || Date.now() - entry.since > FAILURE_WINDOW_MS) failures.set(key, { count: 1, since: Date.now() })
  else entry.count += 1
}

type UserRow = {
  id: string
  email: string
  encrypted_password: string
  raw_user_meta_data: Record<string, unknown>
  email_confirmed_at: string | null
  created_at: string
  last_sign_in_at: string | null
  /** Set by an admin: no sign-in and no live session while it is. */
  banned_at?: string | null
}

function toUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    user_metadata: row.raw_user_meta_data ?? {},
    created_at: row.created_at,
    last_sign_in_at: row.last_sign_in_at,
  }
}

async function startSession(userId: string) {
  const db = await getDb()
  const token = randomBytes(32).toString('base64url')
  await db.query(
    `insert into auth.sessions (token_hash, user_id, expires_at)
     values ($1, $2, now() + make_interval(days => $3))`,
    [sha256(token), userId, SESSION_DAYS],
  )
  await db.query('update auth.users set last_sign_in_at = now() where id = $1', [userId])
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
  return { access_token: token, user_id: userId }
}

/** The signed-in user for this request, or null. Deduplicated per render. */
export const getSessionUser = cache(async (): Promise<AuthUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  const db = await getDb()
  const { rows } = await db.query<UserRow>(
    `select u.* from auth.sessions s join auth.users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now() and u.banned_at is null`,
    [sha256(token)],
  )
  return rows[0] ? toUser(rows[0]) : null
})

/** Accepts an email address or a profile username. */
async function findUser(login: string) {
  const db = await getDb()
  const { rows } = await db.query<UserRow>(
    `select u.* from auth.users u
       left join public.profiles p on p.id = u.id
      where lower(u.email) = lower($1) or lower(p.username) = lower($1)
      limit 1`,
    [login.trim()],
  )
  return rows[0] ?? null
}

export const localAuth = {
  async getUser() {
    return { data: { user: await getSessionUser() }, error: null }
  },

  async getClaims() {
    const user = await getSessionUser()
    return { data: user ? { claims: { sub: user.id, email: user.email } } : null, error: null }
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const key = email.trim().toLowerCase()
    if (isThrottled(key)) {
      return { data: { user: null, session: null }, error: fail('Too many attempts. Try again in 15 minutes.', 429) }
    }
    const row = await findUser(email)
    // Same message for an unknown login and a wrong password, so the form
    // cannot be used to discover which accounts exist.
    if (!row || !(await verifyPassword(password, row.encrypted_password))) {
      recordFailure(key)
      return { data: { user: null, session: null }, error: fail('Invalid login credentials') }
    }
    failures.delete(key)
    // Blocked from the admin panel. Said plainly: the person knows their
    // password was right, and a vague error would only send them to reset it.
    if (row.banned_at) {
      return { data: { user: null, session: null }, error: fail('This account has been blocked. Contact the administrators.', 423) }
    }
    // The password was right but the address was never confirmed: no session
    // until it is. The caller sends a fresh code and shows the code screen.
    if (!row.email_confirmed_at) {
      return { data: { user: toUser(row), session: null }, error: fail('Email not confirmed', 403) }
    }
    const session = await startSession(row.id)
    return { data: { user: toUser(row), session }, error: null }
  },

  async signUp({
    email,
    password,
    options,
  }: {
    email: string
    password: string
    options?: { data?: Record<string, unknown>; emailRedirectTo?: string }
  }) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { data: { user: null, session: null }, error: fail('Unable to validate email address: invalid format') }
    }
    if (password.length < 6) {
      return { data: { user: null, session: null }, error: fail('Password should be at least 6 characters.') }
    }
    const db = await getDb()
    try {
      // The handle_new_user trigger from the first migration creates the profile.
      // Unconfirmed until the emailed code comes back, so there is no session yet.
      const { rows } = await db.query<UserRow>(
        `insert into auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
         values (lower($1), $2, $3, null) returning *`,
        [email.trim(), await hashPassword(password), JSON.stringify(options?.data ?? {})],
      )
      return { data: { user: toUser(rows[0]!), session: null }, error: null }
    } catch (cause) {
      const code = (cause as { code?: string }).code
      if (code === '23505') {
        // Signing up again with an address that never confirmed: hand back the
        // existing account so a new code goes out, instead of a dead end. Its
        // password is not touched; whoever has the mailbox can reset it.
        const existing = await findUser(email)
        if (existing && !existing.email_confirmed_at) {
          return { data: { user: toUser(existing), session: null }, error: null }
        }
      }
      return {
        data: { user: null, session: null },
        error: fail(code === '23505' ? 'User already registered' : 'Unable to create the account.'),
      }
    }
  },

  async signOut() {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (token) {
      const db = await getDb()
      await db.query('delete from auth.sessions where token_hash = $1', [sha256(token)])
    }
    store.delete(SESSION_COOKIE)
    return { error: null }
  },

  async updateUser({ password }: { password?: string }) {
    const user = await getSessionUser()
    if (!user) return { data: { user: null }, error: fail('Auth session missing!', 401) }
    if (password !== undefined) {
      if (password.length < 6) return { data: { user }, error: fail('Password should be at least 6 characters.') }
      const db = await getDb()
      await db.query('update auth.users set encrypted_password = $1 where id = $2', [await hashPassword(password), user.id])
    }
    return { data: { user }, error: null }
  },

  admin: {
    async listUsers(options?: { perPage?: number; page?: number }) {
      const perPage = options?.perPage ?? 50
      const page = Math.max(1, options?.page ?? 1)
      const db = await getDb()
      const { rows } = await db.query<UserRow>(
        'select * from auth.users order by created_at desc limit $1 offset $2',
        [perPage, (page - 1) * perPage],
      )
      return { data: { users: rows.map(toUser) }, error: null }
    },
  },
}

// ------------------------------------------------------------ email codes ---

/**
 * Six-digit codes by email, for confirming a new address and for resetting a
 * password.
 *
 * The code is tied to a ticket: 32 random bytes in an httpOnly cookie, hashed
 * in auth.email_codes next to the hashed code. The screen that asks for the
 * code finds its account through the cookie, so the address never goes into a
 * URL, and guessing needs both the cookie and the code. A code lasts
 * CODE_MINUTES and survives MAX_GUESSES wrong tries; a new one may be sent
 * every RESEND_SECONDS, at most HOURLY_CODES an hour per account and purpose.
 */

export const PENDING_COOKIE = 'olympai-pending'
const CODE_MINUTES = 15
const MAX_GUESSES = 5
const RESEND_SECONDS = 60
const HOURLY_CODES = 6

type CodeRow = {
  id: string
  user_id: string
  ticket_hash: string
  purpose: CodePurpose
  code_hash: string
  attempts: number
  sent_at: string
  expires_at: string
  consumed_at: string | null
  email: string
}

const codeHash = (ticketHash: string, code: string) => sha256(`${ticketHash}:${code}`)

async function setPending(ticket: string) {
  ;(await cookies()).set(PENDING_COOKIE, ticket, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60,
  })
}

async function pendingRow(purpose: CodePurpose): Promise<CodeRow | null> {
  const ticket = (await cookies()).get(PENDING_COOKIE)?.value
  if (!ticket) return null
  const db = await getDb()
  const { rows } = await db.query<CodeRow>(
    `select c.*, u.email from auth.email_codes c join auth.users u on u.id = c.user_id
      where c.ticket_hash = $1 and c.purpose = $2`,
    [sha256(ticket), purpose],
  )
  return rows[0] ?? null
}

export type IssueResult = { ok: true } | { ok: false; reason: 'wait' | 'limit' | 'mail'; seconds?: number }

/** Sends a fresh code to the account and points the pending cookie at it. */
export async function issueEmailCode(userId: string, purpose: CodePurpose, locale: Locale): Promise<IssueResult> {
  const db = await getDb()
  const { rows: recent } = await db.query<{ sent_at: string }>(
    `select sent_at from auth.email_codes
      where user_id = $1 and purpose = $2 and sent_at > now() - interval '1 hour'
      order by sent_at desc`,
    [userId, purpose],
  )
  if (recent[0]) {
    const since = (Date.now() - new Date(recent[0].sent_at).getTime()) / 1000
    if (since < RESEND_SECONDS) return { ok: false, reason: 'wait', seconds: Math.ceil(RESEND_SECONDS - since) }
  }
  if (recent.length >= HOURLY_CODES) return { ok: false, reason: 'limit' }

  const { rows: users } = await db.query<{ email: string }>('select email from auth.users where id = $1', [userId])
  if (!users[0]) return { ok: false, reason: 'mail' }

  const ticket = randomBytes(32).toString('base64url')
  const ticketHash = sha256(ticket)
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await db.transaction(async (tx) => {
    // One open code per account and purpose: the newest replaces the rest.
    await tx.query(
      `update auth.email_codes set consumed_at = now()
        where user_id = $1 and purpose = $2 and consumed_at is null`,
      [userId, purpose],
    )
    await tx.query(
      `insert into auth.email_codes (ticket_hash, user_id, purpose, code_hash, expires_at)
       values ($1, $2, $3, $4, now() + make_interval(mins => $5))`,
      [ticketHash, userId, purpose, codeHash(ticketHash, code), CODE_MINUTES],
    )
  })

  try {
    await sendMail({ to: users[0].email, ...codeLetter(purpose, code, CODE_MINUTES, locale) })
  } catch (cause) {
    if (cause instanceof MailError) {
      // Unsent, so it must not count against the resend limits either.
      await db.query('delete from auth.email_codes where ticket_hash = $1', [ticketHash])
      return { ok: false, reason: 'mail' }
    }
    throw cause
  }
  await setPending(ticket)
  return { ok: true }
}

/**
 * For a reset requested for an address with no account: a ticket that matches
 * nothing, so the code screen behaves exactly as it does for a real account
 * and the form cannot be used to find out who is registered.
 */
export async function issueDecoyTicket() {
  await setPending(randomBytes(32).toString('base64url'))
}

/** What the code screen shows: the address, masked, and whose code it is. */
export async function getPendingCode(purpose: CodePurpose) {
  const row = await pendingRow(purpose)
  if (!row) return null
  const [name = '', domain = ''] = row.email.split('@')
  const masked = `${name.slice(0, 2)}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`
  return { email: masked, userId: row.user_id }
}

export type VerifyError = 'expired' | 'wrong' | 'spent'

/**
 * Checks a code against the pending ticket and spends it on success. Returns
 * the account it belongs to; the caller decides what the code unlocks.
 */
async function consumeCode(purpose: CodePurpose, code: string): Promise<{ userId: string } | { error: VerifyError }> {
  const row = await pendingRow(purpose)
  if (!row || row.consumed_at || new Date(row.expires_at).getTime() < Date.now()) return { error: 'expired' }
  if (row.attempts >= MAX_GUESSES) return { error: 'spent' }

  const given = Buffer.from(codeHash(row.ticket_hash, code.replace(/\D/g, '')))
  const stored = Buffer.from(row.code_hash)
  const db = await getDb()
  if (given.length !== stored.length || !timingSafeEqual(given, stored)) {
    await db.query('update auth.email_codes set attempts = attempts + 1 where id = $1', [row.id])
    return { error: row.attempts + 1 >= MAX_GUESSES ? 'spent' : 'wrong' }
  }
  const { rows } = await db.query<{ user_id: string }>(
    'update auth.email_codes set consumed_at = now() where id = $1 and consumed_at is null returning user_id',
    [row.id],
  )
  if (!rows[0]) return { error: 'expired' }
  ;(await cookies()).delete(PENDING_COOKIE)
  return { userId: rows[0].user_id }
}

/** Signup: the code confirms the address and signs the student in. */
export async function confirmSignupCode(code: string) {
  const result = await consumeCode('signup', code)
  if ('error' in result) return result
  const db = await getDb()
  await db.query('update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1', [
    result.userId,
  ])
  await startSession(result.userId)
  return { ok: true as const, userId: result.userId }
}

/**
 * Reset: the code and the new password arrive together. Every other session
 * is signed out — a reset is often because someone else got in. Reaching the
 * mailbox also proves the address, so an unconfirmed account is confirmed.
 */
export async function resetPasswordWithCode(code: string, password: string) {
  const result = await consumeCode('reset', code)
  if ('error' in result) return result
  const db = await getDb()
  await db.query(
    'update auth.users set encrypted_password = $1, email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $2',
    [await hashPassword(password), result.userId],
  )
  await db.query('delete from auth.sessions where user_id = $1', [result.userId])
  await startSession(result.userId)
  return { ok: true as const }
}

/** The account a reset request names, by email or username. */
export async function findAccountId(login: string) {
  return (await findUser(login))?.id ?? null
}
