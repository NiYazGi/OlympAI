import { NextResponse, type NextRequest } from 'next/server'
import { GATE_COOKIE, gatePassword, gateToken } from '@/lib/site-gate'

/** Kept in step with SESSION_COOKIE in lib/db/auth.ts, which the proxy cannot import. */
const SESSION_COOKIE = 'olympai-session'

/** The routes that need a session. Everything else is public. */
const PROTECTED = [
  '/dashboard',
  '/ranking',
  '/path',
  '/learn',
  '/mock',
  '/tasks',
  '/sulu-ai',
  '/progress',
  '/study-plan',
  '/olympiads',
  '/profile',
  '/me',
  '/settings',
  '/onboarding',
  '/admin',
  '/class',
  '/plan',
  '/method',
  '/methods',
  '/pricing',
  '/checkout',
  '/documents',
  '/forum',
  '/u',
]

function isProtected(pathname: string) {
  return PROTECTED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Two cheap cookie checks and nothing else.
 *
 * 1. The site gate (test deployment only, SITE_GATE_PASSWORD): without the
 *    gate cookie every page goes to /gate and every API call gets 401.
 * 2. The session: presence is enough to decide whether to send someone to the
 *    login page. The session itself is validated where data is read
 *    (lib/db/auth.ts), so a forged or expired cookie gets past here and then
 *    sees nothing. Signed-in visitors on /login are redirected by the login
 *    page, which can tell a live session from a stale cookie; doing that here
 *    could loop.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const password = gatePassword()

  if (password) {
    const open = pathname === '/gate' || pathname === '/api/health'
    const passed = request.cookies.get(GATE_COOKIE)?.value === (await gateToken(password))
    if (!open && !passed) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Site is password protected.' }, { status: 401, headers: { 'X-Robots-Tag': 'noindex, nofollow' } })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/gate'
      url.search = ''
      url.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
      const response = NextResponse.redirect(url)
      response.headers.set('X-Robots-Tag', 'noindex, nofollow')
      return response
    }
  }

  if (isProtected(pathname) && !request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  const response = NextResponse.next()
  // A test deployment never belongs in search results.
  if (password) response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
}

export const config = {
  /*
   * Every request but build assets and public files. The live site has no
   * gate, so for its public pages this is one cookie lookup and a pass.
   */
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)'],
}
