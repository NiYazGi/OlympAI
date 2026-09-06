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
        .select('onboarding_completed_at')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }
  if (!profile?.onboarding_completed_at) redirect('/onboarding')

  redirect(next)
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!fullName || !email || !password) authError('/signup', 'Complete all required fields.')
  if (password.length < MIN_PASSWORD_LENGTH) {
    authError('/signup', `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`)
  }
  if (fullName.length > 120) authError('/signup', 'That name is too long.')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    },
  })
  if (error) authError('/signup', error.message)

  if (data.session) redirect('/onboarding')
  redirect('/login?message=Check your email to confirm your account.')
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
