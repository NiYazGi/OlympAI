import 'server-only'

/**
 * The service-role key, isolated in its own `server-only` module.
 *
 * It used to sit next to the public accessors in env.ts, which is reachable
 * from client code. Bundlers replace non-`NEXT_PUBLIC_` variables with
 * undefined in the browser, so no value would have leaked — but the safe
 * outcome depended on bundler behaviour rather than on anything enforced.
 * Importing this file from a `'use client'` module now fails the build.
 *
 * Read lazily inside the functions: at module scope the value would be
 * captured wherever this module is evaluated.
 */
export function getSupabaseSecretKey() {
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!secretKey) {
    throw new Error(
      'Missing SUPABASE_SECRET_KEY. Grading writes attempts with the service role so that a browser cannot submit its own score. Add it to .env.local (server-only, never NEXT_PUBLIC_).',
    )
  }
  return secretKey
}

export function hasSupabaseSecretKey() {
  return Boolean(process.env.SUPABASE_SECRET_KEY)
}
