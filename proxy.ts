import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/database.types'
import { getSupabaseEnv, hasSupabaseEnv } from '@/lib/supabase/env'

const protectedPrefixes = [
  '/dashboard',
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
]
const authRoutes = ['/login', '/signup']

function isSafeNext(path: string | null): path is string {
  // Reject protocol-relative ("//evil.com") and absolute URLs so `next` cannot
  // be used as an open redirect.
  return Boolean(path && path.startsWith('/') && !path.startsWith('//'))
}

export async function proxy(request: NextRequest) {
  if (!hasSupabaseEnv()) return NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv()
  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  /*
   * getClaims() verifies the access token's signature locally against the
   * project's JWKS — this project signs with asymmetric ES256, so the public
   * keys are fetchable and cached. getUser() used to sit here instead, and it
   * POSTs to Supabase Auth on every navigation: measured at 0.5-1.3 s against
   * this project, paid before a single byte of the page was produced.
   *
   * It still refreshes an expiring session, because the SSR client's storage
   * adapter does that when it reads the token — just once an hour rather than
   * once a click.
   *
   * The weaker guarantee is bounded and acceptable here: a session revoked
   * server-side stays usable until its token expires. This gate only decides
   * which page to render. What that page may actually read is decided by RLS
   * from the same token, and the one privileged write in the app — recording a
   * grade with the service role — still calls getUser() first.
   */
  const { data, error } = await supabase.auth.getClaims()
  const signedIn = !error && Boolean(data?.claims?.sub)

  const pathname = request.nextUrl.pathname
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (!signedIn && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (signedIn && authRoutes.includes(pathname)) {
    const next = request.nextUrl.searchParams.get('next')
    return NextResponse.redirect(
      new URL(isSafeNext(next) ? next : '/dashboard', request.url),
    )
  }

  return response
}

export const config = {
  /*
   * Scoped to the routes that actually need a session decision. It used to run
   * on every request that was not a static asset, so the marketing page paid
   * for an auth check it never used.
   */
  matcher: [
    '/dashboard/:path*',
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
    '/login',
    '/signup',
  ],
}
