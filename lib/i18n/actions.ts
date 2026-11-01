'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from '@/lib/i18n/config'

/**
 * Writes the chosen language and re-renders everything.
 *
 * `revalidatePath('/', 'layout')` rather than the current route: the language
 * is on the shell — the rail, the header, the account — so refreshing one page
 * would leave a Russian dashboard inside an English frame.
 */
export async function setLocale(value: string) {
  if (!isLocale(value)) return
  const store = await cookies()
  store.set(LOCALE_COOKIE, value, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  })
  revalidatePath('/', 'layout')
}
