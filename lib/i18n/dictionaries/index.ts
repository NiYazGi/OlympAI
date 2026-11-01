import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config'
import { en, type Dictionary } from '@/lib/i18n/dictionaries/en'
import { ru } from '@/lib/i18n/dictionaries/ru'

export type { Dictionary } from '@/lib/i18n/dictionaries/en'

/**
 * Both languages are imported rather than loaded per locale.
 *
 * A dynamic import would keep one of them out of the client bundle, at the
 * cost of making every component that needs a word asynchronous. These are a
 * few kilobytes of text; the trade is not close.
 */
const DICTIONARIES: Record<Locale, Dictionary> = { en, ru }

export function dictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
}
