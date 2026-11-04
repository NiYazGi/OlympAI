/**
 * Interface languages.
 *
 * Messages are keyed by their English text rather than by invented ids: the
 * English stays readable where it is used, and a string nobody has translated
 * yet simply falls back to itself instead of rendering a key. Values may carry
 * `{name}` placeholders, and `{name|form|form…}` picks a plural form by the
 * number in `name`: English and Kazakh take one|other, Russian one|few|many.
 *
 * Only the interface is translated. Problems and lessons come from the
 * database in whatever language they were written in.
 */

export const LOCALES = ['en', 'ru', 'kk'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'olympai-locale'

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  kk: 'Қазақша',
}

/** Language names as a model reads them in an English prompt. */
export const LOCALE_NAMES_EN: Record<Locale, string> = { en: 'English', ru: 'Russian', kk: 'Kazakh' }

export const LOCALE_SHORT: Record<Locale, string> = { en: 'EN', ru: 'RU', kk: 'KZ' }

/** BCP 47 tags for Intl date and number formatting. */
export const LOCALE_TAGS: Record<Locale, string> = { en: 'en-GB', ru: 'ru-RU', kk: 'kk-KZ' }

export type Messages = Record<string, string>
export type Vars = Record<string, string | number>
export type Translate = (key: string, vars?: Vars) => string

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** Plural categories in the order a `{n|…}` placeholder lists its forms. */
const FORM_ORDER: Record<Locale, Intl.LDMLPluralRule[]> = {
  en: ['one', 'other'],
  kk: ['one', 'other'],
  ru: ['one', 'few', 'many'],
}

function pluralForm(locale: Locale, count: number, forms: string[]) {
  const category = new Intl.PluralRules(LOCALE_TAGS[locale]).select(count)
  const index = FORM_ORDER[locale].indexOf(category)
  // Fractions are "other" in Russian, which reads like the genitive "few" form.
  return forms[index >= 0 ? index : Math.min(1, forms.length - 1)] ?? forms[forms.length - 1]
}

export function interpolate(text: string, vars?: Vars, locale: Locale = 'en') {
  if (!vars) return text
  return text.replace(/\{(\w+)((?:\|[^|{}]*)+)?\}/g, (match, name: string, forms?: string) => {
    if (!(name in vars)) return match
    if (!forms) return String(vars[name])
    return pluralForm(locale, Number(vars[name]), forms.slice(1).split('|'))
  })
}

export function makeTranslate(messages: Messages, locale: Locale = 'en'): Translate {
  // An untranslated key is English, so its plurals follow English rules.
  return (key, vars) => (Object.hasOwn(messages, key) ? interpolate(messages[key], vars, locale) : interpolate(key, vars))
}

/** For code that is only ever English, or that runs before a locale is known. */
export const identity: Translate = (key, vars) => interpolate(key, vars)

const KK_MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
const KK_WEEKDAYS = ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі']

/**
 * Dates in the interface language. Kazakh is spelled out by hand: browsers and
 * Node often ship without kk-KZ calendar data and fall back to "M10 29".
 * Honours the same options Intl would: weekday, month (long or short), year.
 */
export function formatDate(date: Date, locale: Locale, options: Intl.DateTimeFormatOptions) {
  if (locale !== 'kk') return date.toLocaleDateString(LOCALE_TAGS[locale], options)
  const utc = options.timeZone === 'UTC'
  const day = utc ? date.getUTCDate() : date.getDate()
  const monthIndex = utc ? date.getUTCMonth() : date.getMonth()
  const month = options.month === 'long' ? KK_MONTHS[monthIndex] : KK_MONTHS[monthIndex].slice(0, 3)
  const year = options.year ? ` ${utc ? date.getUTCFullYear() : date.getFullYear()} ж.` : ''
  const weekday = options.weekday ? `, ${KK_WEEKDAYS[utc ? date.getUTCDay() : date.getDay()]}` : ''
  return `${day} ${month}${year}${weekday}`
}

/** A calendar day (YYYY-MM-DD) as "20 December", in the interface language. */
export function formatDay(day: string, locale: Locale) {
  return formatDate(new Date(`${day}T00:00:00Z`), locale, { day: 'numeric', month: 'long', timeZone: 'UTC' })
}

/** The narrow weekday of a calendar day, for a week strip. */
export function formatWeekday(day: string, locale: Locale) {
  const date = new Date(`${day}T00:00:00Z`)
  if (locale === 'kk') return KK_WEEKDAYS[date.getUTCDay()].slice(0, 2)
  return date.toLocaleDateString(LOCALE_TAGS[locale], { weekday: 'narrow', timeZone: 'UTC' })
}
