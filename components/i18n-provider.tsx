'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { DEFAULT_LOCALE, makeTranslate, type Locale, type Messages, type Translate } from '@/lib/i18n/config'

const I18nContext = createContext<{ locale: Locale; t: Translate }>({
  locale: DEFAULT_LOCALE,
  t: makeTranslate({}),
})

/** Receives only the active language's messages from the root layout. */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale
  messages: Messages
  children: ReactNode
}) {
  const value = useMemo(() => ({ locale, t: makeTranslate(messages, locale) }), [locale, messages])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT() {
  return useContext(I18nContext).t
}

export function useLocale() {
  return useContext(I18nContext).locale
}
