import { formatDate, type Locale, type Translate } from '@/lib/i18n/config'

/** "5m ago", "3h ago", "2d ago"; a date past a month. */
export function ago(value: string | Date | null | undefined, t: Translate, locale: Locale) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  const minutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return t('just now')
  if (minutes < 60) return t('{n}m ago', { n: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('{n}h ago', { n: hours })
  const days = Math.round(hours / 24)
  if (days <= 30) return t('{n}d ago', { n: days })
  return formatDate(date, locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function shortDate(value: string | Date | null | undefined, locale: Locale) {
  if (!value) return '—'
  return formatDate(value instanceof Date ? value : new Date(value), locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function displayName(row: { full_name?: string | null; username?: string | null; email?: string | null }, t: Translate) {
  return row.full_name || row.username || row.email || t('Unnamed student')
}
