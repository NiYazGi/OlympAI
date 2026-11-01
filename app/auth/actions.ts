'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
 * Origin for links Supabase mails out. NEXT_PUBLIC_SITE_URL wins; the request
 * host is the fallback for local development, and is only ever used to build a
 * URL on this deployment.
 */
async function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/$/, '')
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https'
  return `${protocol}://${host}`
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))
  if (!email || !password) authError('/login', 'Enter your email and password.')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) authError('/login', error.message)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('onboarding_completed_at, role')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }
  // Onboarding asks a student's questions, and a teacher's profile is created
  // with it already marked complete. The `next` is carried through it so an
  // invite link survives the detour.
  if (!profile?.onboarding_completed_at) {
    redirect(next === '/dashboard' ? '/onboarding' : `/onboarding?next=${encodeURIComponent(next)}`)
  }
  if (profile.role === 'teacher' && next === '/dashboard') redirect('/class')

  redirect(next)
}

/**
 * A Telegram username as the person will type it: with or without the @, in
 * whatever case they like. Stored folded and bare, because Telegram treats
 * them case-insensitively and the bot matches on what it is handed.
 */
function telegramUsername(raw: string): string | null {
  const value = raw.trim().replace(/^@/, '').toLowerCase()
  if (!value) return null
  return /^[a-z0-9_]{5,32}$/.test(value) ? value : ''
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const telegram = telegramUsername(String(formData.get('telegram_username') ?? ''))
  // Two kinds of account, and the only question that cannot be changed later
  // from inside the app. Anything other than the two values is a student.
  const role = formData.get('role') === 'teacher' ? 'teacher' : 'student'
  // Where they were going before they were asked to sign up — an invite link,
  // usually. The trigger that creates the profile does not know about it, so it
  // travels on the query string from here to onboarding and out the other side.
  const next = safeNext(formData.get('next'), '')

  if (!fullName || !email || !password) authError('/signup', 'Complete all required fields.')
  // An empty string means "given, and not a username". Null means "not given",
  // which is allowed: the bot is an offer, not a gate.
  if (telegram === '') {
    authError('/signup', 'That is not a Telegram username. Five to thirty-two letters, digits or underscores.')
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    authError('/signup', `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`)
  }
  if (fullName.length > 120) authError('/signup', 'That name is too long.')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, telegram_username: telegram, role },
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    },
  })
  if (error) authError('/signup', error.message)

  if (data.session) {
    // A teacher skips the six student questions; their profile is created with
    // onboarding already marked complete, so there is nothing to answer.
    if (role === 'teacher') redirect(next || '/class')
    redirect(next ? `/onboarding?next=${encodeURIComponent(next)}` : '/onboarding')
  }
  const message = 'Check your email to confirm your account.'
  redirect(
    next
      ? `/login?message=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`
      : `/login?message=${encodeURIComponent(message)}`,
  )
}

/**
 * Password recovery. The "Forgot password?" control used to be a button that
 * set a notice reading "will be available when authentication is connected" —
 * on a screen where authentication was already connected.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) authError('/login', 'Enter your email address first.')

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  })

  // Always the same reply, whether or not the address has an account: a
  // different message would let anyone probe for registered emails.
  redirect('/login?message=If that address has an account, a reset link is on its way.')
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '')
  const confirmation = String(formData.get('password_confirmation') ?? '')

  if (password.length < MIN_PASSWORD_LENGTH) {
    authError('/reset-password', `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`)
  }
  if (password !== confirmation) authError('/reset-password', 'The two passwords do not match.')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) authError('/login', 'That reset link has expired. Request a new one.')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) authError('/reset-password', error.message)

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
