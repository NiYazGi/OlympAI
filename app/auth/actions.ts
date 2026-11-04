'use server'

import { getSiteSettings } from '@/lib/admin/settings'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  confirmSignupCode,
  findAccountId,
  getPendingCode,
  issueDecoyTicket,
  issueEmailCode,
  resetPasswordWithCode,
  type IssueResult,
  type VerifyError,
} from '@/lib/db/auth'
import { getLocale } from '@/lib/i18n/server'

const MIN_PASSWORD_LENGTH = 8

function authError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`)
}

/** Rejects protocol-relative and absolute URLs so `next` cannot open-redirect. */
function safeNext(value: unknown, fallback = '/dashboard') {
  const path = typeof value === 'string' ? value : ''
  return path.startsWith('/') && !path.startsWith('//') ? path : fallback
}

/**
 * Where someone was going before they were asked to sign up — an invite link,
 * usually. It has to outlast the code screen and onboarding, so it waits in a
 * short-lived cookie rather than riding on every URL in between.
 */
const NEXT_COOKIE = 'olympai-next'

async function rememberNext(next: string) {
  if (!next || next === '/dashboard') return
  ;(await cookies()).set(NEXT_COOKIE, next, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 })
}

async function takeNext() {
  const store = await cookies()
  const next = safeNext(store.get(NEXT_COOKIE)?.value, '')
  store.delete(NEXT_COOKIE)
  return next
}

/** After a session starts: a teacher to their classes, a new student to onboarding. */
async function landing(userId: string, next: string): Promise<never> {
  const { data: profile } = await createAdminClient()
    .from('profiles')
    .select('onboarding_completed_at, role')
    .eq('id', userId)
    .maybeSingle()
  if (!profile?.onboarding_completed_at) {
    redirect(next && next !== '/dashboard' ? `/onboarding?next=${encodeURIComponent(next)}` : '/onboarding')
  }
  if (profile.role === 'teacher' && (!next || next === '/dashboard')) redirect('/class')
  redirect(next || '/dashboard')
}

/**
 * A Telegram username as the person will type it: with or without the @, in
 * whatever case. Null means not given, which is allowed; an empty string means
 * given and not a username.
 */
function telegramUsername(raw: string): string | null {
  const value = raw.trim().replace(/^@/, '').toLowerCase()
  if (!value) return null
  return /^[a-z0-9_]{5,32}$/.test(value) ? value : ''
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))
  if (!email || !password) authError('/login', 'Enter your email and password.')

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({ email, password })
  if (error?.status === 403 && user) {
    // Right password, unconfirmed address: send a code and ask for it.
    await rememberNext(next)
    const sent = await issueEmailCode(user.id, 'signup', await getLocale())
    redirect(`/verify${issueQuery(sent)}`)
  }
  if (error) authError('/login', error.message)
  if (!user) authError('/login', 'Invalid login credentials')

  // The request's client was made before the session existed, so it reads as
  // a guest; landing() reads the profile with the id the password check returned.
  await landing(user.id, next)
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  // Closed from the admin panel: existing accounts still sign in.
  if (!(await getSiteSettings()).signupsOpen) authError('/signup', 'New accounts are closed for now. Try again later.')
  if (!fullName || !email || !password) authError('/signup', 'Complete all required fields.')
  if (password.length < MIN_PASSWORD_LENGTH) {
    authError('/signup', `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`)
  }
  if (fullName.length > 120) authError('/signup', 'That name is too long.')

  // Two kinds of account, and the one answer that cannot be changed later
  // from inside the app. Anything other than the two values is a student.
  const role = formData.get('role') === 'teacher' ? 'teacher' : 'student'
  const telegram = role === 'student' ? telegramUsername(String(formData.get('telegram_username') ?? '')) : null
  if (telegram === '') {
    authError('/signup', 'That is not a Telegram username. Five to thirty-two letters, digits or underscores.')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, telegram_username: telegram, role } },
  })
  if (error) authError('/signup', error.message)
  if (!data.user) authError('/signup', 'Unable to create the account.')

  await rememberNext(safeNext(formData.get('next'), ''))
  const sent = await issueEmailCode(data.user.id, 'signup', await getLocale())
  redirect(`/verify${issueQuery(sent)}`)
}

/** The notice the code screen shows when a code could not be sent just now. */
function issueQuery(result: IssueResult) {
  if (result.ok) return ''
  if (result.reason === 'wait') return `?error=${encodeURIComponent(`wait:${result.seconds ?? 60}`)}`
  if (result.reason === 'limit') return `?error=${encodeURIComponent('Too many codes requested. Try again in an hour.')}`
  return `?error=${encodeURIComponent('The email could not be sent. Try again in a minute.')}`
}

const VERIFY_ERRORS: Record<VerifyError, string> = {
  wrong: 'That code is not right. Check the email and try again.',
  spent: 'Too many wrong tries. Request a new code.',
  expired: 'That code has expired. Request a new one.',
}

export async function verifySignup(formData: FormData) {
  const code = String(formData.get('code') ?? '')
  if (!/^\d{6}$/.test(code.replace(/\s/g, ''))) authError('/verify', 'Enter the six digits from the email.')
  const result = await confirmSignupCode(code)
  if ('error' in result) authError('/verify', VERIFY_ERRORS[result.error])
  await landing(result.userId, await takeNext())
}

export async function resendSignupCode() {
  const pending = await getPendingCode('signup')
  if (!pending) authError('/login', 'Log in again to get a new code.')
  const sent = await issueEmailCode(pending.userId, 'signup', await getLocale())
  redirect(sent.ok ? '/verify?message=A new code is on its way.' : `/verify${issueQuery(sent)}`)
}

/**
 * Password recovery by emailed code. The reply is the same whether or not the
 * address has an account — an unknown one gets a ticket that matches nothing —
 * so the form cannot be used to probe for registered emails.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) authError('/login', 'Enter your email address first.')

  const userId = await findAccountId(email)
  if (!userId) {
    await issueDecoyTicket()
    redirect('/reset-password')
  }
  const sent = await issueEmailCode(userId, 'reset', await getLocale())
  // "wait" and "limit" would tell apart a real account; keep them quiet here
  // and let the code screen offer a resend instead.
  if (!sent.ok && sent.reason === 'mail') {
    authError('/login', 'The email could not be sent. Try again in a minute.')
  }
  redirect('/reset-password')
}

export async function resendResetCode() {
  const pending = await getPendingCode('reset')
  // A decoy ticket has no account behind it: answer as if a code went out.
  if (!pending) redirect('/reset-password?message=A new code is on its way.')
  const sent = await issueEmailCode(pending.userId, 'reset', await getLocale())
  redirect(sent.ok ? '/reset-password?message=A new code is on its way.' : `/reset-password${issueQuery(sent)}`)
}

export async function resetPassword(formData: FormData) {
  const code = String(formData.get('code') ?? '')
  const password = String(formData.get('password') ?? '')
  const confirmation = String(formData.get('password_confirmation') ?? '')

  if (!/^\d{6}$/.test(code.replace(/\s/g, ''))) authError('/reset-password', 'Enter the six digits from the email.')
  if (password.length < MIN_PASSWORD_LENGTH) {
    authError('/reset-password', `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`)
  }
  if (password !== confirmation) authError('/reset-password', 'The two passwords do not match.')

  const result = await resetPasswordWithCode(code, password)
  if ('error' in result) authError('/reset-password', VERIFY_ERRORS[result.error])
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
