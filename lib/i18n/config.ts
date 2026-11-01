/**
 * Two languages, chosen per account and remembered in a cookie.
 *
 * No `/ru` prefix on the routes. A locale in the path means every internal
 * link has to carry it, every redirect has to rebuild it, and a shared link
 * decides the reader's language for them. The cookie is read on the server, so
 * the first paint is already in the right language — there is no flash of
 * English and no client round trip.
 */
export const LOCALES = ['ru', 'en'] as const

export type Locale = (typeof LOCALES)[number]

/**
 * English is the fallback rather than the preference: it is the language the
 * problems, lessons and every official olympiad page are written in, so it is
 * the one that is never wrong. A first visit is matched against
 * `Accept-Language` before it lands here.
 */
export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_COOKIE = 'olympai-locale'

/** A year: the choice should outlive a browser restart. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale)
}

export const LOCALE_NAMES: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
}

/**
 * The first supported language in an `Accept-Language` header.
 *
 * Only used when the cookie is absent, which is the first request of a first
 * visit. `ru-KZ` and `ru` both count as Russian; anything else falls through
 * to the default.
 */
export function localeFromHeader(header: string | null): Locale | null {
  if (!header) return null
  for (const part of header.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase()
    if (!tag) continue
    const base = tag.split('-')[0]
    if (isLocale(base)) return base
  }
  return null
}

/**
 * A calendar date (YYYY-MM-DD) as a reader says it: "20 декабря", "20 December".
 *
 * Formatted in UTC because the value is a date, not a moment: a deadline of
 * 20 December is the 20th in Almaty and in London, and reading it as midnight
 * local time would print the 19th west of Greenwich.
 */
export function formatDay(date: string, locale: Locale) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}
