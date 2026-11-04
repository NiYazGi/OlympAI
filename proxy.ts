import { NextResponse, type NextRequest } from 'next/server'

/** Kept in step with SESSION_COOKIE in lib/db/auth.ts, which the proxy cannot import. */
const SESSION_COOKIE = 'olympai-session'


/**
 * A cookie check and nothing else. It used to verify a Supabase token here on
 * every navigation, which put an auth call in front of the first byte of every
 * protected page.
 *
 * Presence is enough for this gate: it only decides whether to send someone to
 * the login page. The session itself is validated where data is read
 * (lib/db/auth.ts), so a forged or expired cookie gets past here and then sees
 * nothing. Signed-in visitors on /login are redirected by the login page, which
 * can tell a live session from a stale cookie; doing that here could loop.
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const signedIn = Boolean(request.cookies.get(SESSION_COOKIE)?.value)

  if (!signedIn) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  /*
   * Scoped to the routes that actually need a session decision. It used to run
   * on every request that was not a static asset, so the marketing page paid
   * for an auth check it never used.
   */
  matcher: [
    '/dashboard/:path*',
    '/dashboard',
    '/path/:path*',
    '/path',
    '/learn/:path*',
    '/learn',
    '/mock/:path*',
    '/mock',
    '/tasks/:path*',
    '/sulu-ai/:path*',
    '/progress/:path*',
    '/progress',
    '/study-plan/:path*',
    '/study-plan',
    '/olympiads/:path*',
    '/profile/:path*',
    '/profile',
    '/me/:path*',
    '/me',
    '/settings/:path*',
    '/settings',
    '/onboarding/:path*',
    '/onboarding',
    '/tasks',
    '/sulu-ai',
    '/olympiads',
    '/admin/:path*',
    '/admin',
    '/class/:path*',
    '/class',
    '/plan/:path*',
    '/plan',
    '/method',
  ],
}
