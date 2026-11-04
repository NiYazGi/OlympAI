import { NextResponse } from 'next/server'

/**
 * Where emailed links used to land. Signup and password reset now use a code
 * typed on the site, so an old link from before that change goes to the login
 * screen, which offers a fresh code.
 */
export function GET(request: Request) {
  const url = new URL(request.url)
  return NextResponse.redirect(new URL('/login?error=That+link+has+expired.+Request+a+new+one.', url.origin))
}
