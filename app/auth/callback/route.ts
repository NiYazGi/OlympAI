import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Exchanges the one-time code from a confirmation or recovery email for a
 * session. Signup previously pointed its confirmation link at the bare site
 * URL, where nothing consumed the code.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const requested = url.searchParams.get('next') ?? '/dashboard'
  // Only same-origin paths, so the email link cannot bounce a session elsewhere.
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=Invalid+or+expired+link.', url.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(
      new URL('/login?error=That+link+has+expired.+Request+a+new+one.', url.origin),
    )
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
