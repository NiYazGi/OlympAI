import 'server-only'

import { cookies, headers } from 'next/headers'
import { cache } from 'react'
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, makeTranslate, type Locale } from '@/lib/i18n/config'
import { MESSAGES } from '@/lib/i18n/messages'

/**
 * The cookie wins once someone has picked a language. Before that, the
 * browser's own preference decides, so a Russian or Kazakh browser does not
 * open on English first.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value
  if (isLocale(chosen)) return chosen

  const accept = (await headers()).get('accept-language') ?? ''
  for (const part of accept.split(',')) {
    const base = part.trim().slice(0, 2).toLowerCase()
    if (base === 'kk') return 'kk'
    if (base === 'ru') return 'ru'
    if (base === 'en') return 'en'
  }
  return DEFAULT_LOCALE
})

export async function getT() {
  const locale = await getLocale()
  return makeTranslate(MESSAGES[locale], locale)
}
