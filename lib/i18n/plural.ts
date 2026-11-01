/**
 * Plural forms, which English gets wrong in one way and Russian in three.
 *
 * English needs two forms and picks by `n === 1`. Russian needs three and
 * picks by the last digit, with the teens as an exception — 21 день, 22 дня,
 * 25 дней, but 11 дней and 12 дней. Getting this wrong is the single most
 * visible sign that an interface was translated rather than written.
 */
export function pluralEn(n: number, one: string, many: string): string {
  return n === 1 ? one : many
}

/** `[one, few, many]` — день, дня, дней. */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  if (abs >= 11 && abs <= 14) return forms[2]
  const last = abs % 10
  if (last === 1) return forms[0]
  if (last >= 2 && last <= 4) return forms[1]
  return forms[2]
}
