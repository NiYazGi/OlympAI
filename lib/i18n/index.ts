import { cookies, headers } from 'next/headers'
import { cache } from 'react'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeFromHeader, type Locale } from '@/lib/i18n/config'
import { dictionary, type Dictionary } from '@/lib/i18n/dictionaries'

export type { Dictionary } from '@/lib/i18n/dictionaries'
export { dictionary } from '@/lib/i18n/dictionaries'

/**
 * The reader's language, for a server render.
 *
 * Cookie first, because it is a choice the person made. Otherwise the browser's
 * own preference, which is the closest thing to a choice available on a first
 * visit. `cache` so a page that asks in the layout, the page and four
 * components reads the request once.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies()
  const saved = store.get(LOCALE_COOKIE)?.value
  if (isLocale(saved)) return saved

  const header = await headers()
  return localeFromHeader(header.get('accept-language')) ?? DEFAULT_LOCALE
})

/** The strings for this request. `const t = await getT()`. */
export async function getT(): Promise<Dictionary> {
  return dictionary(await getLocale())
}
