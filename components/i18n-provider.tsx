'use client'

import { createContext, use, type ReactNode } from 'react'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config'
import { dictionary, type Dictionary } from '@/lib/i18n/dictionaries'

/**
 * Only the locale crosses the boundary, never the dictionary.
 *
 * Server components hand client components props, and props have to be
 * serialisable — which the dictionary is not, because half of its values are
 * functions that take a count. Passing the two-letter code and letting the
 * client look the strings up itself keeps the plural rules where they belong:
 * in one place, written once, for both sides of the render.
 */
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE)

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>
}

export function useLocale(): Locale {
  return use(LocaleContext)
}

/** The strings, in a client component. `const t = useT()`. */
export function useT(): Dictionary {
  return dictionary(use(LocaleContext))
}
