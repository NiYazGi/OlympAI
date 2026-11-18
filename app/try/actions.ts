'use server'

import { headers } from 'next/headers'
import { gradeDemo, takeDemoSlot } from '@/lib/demo'
import { getLocale, getT } from '@/lib/i18n/server'
import type { Protocol } from '@/lib/protocol'

export type DemoResult = { ok: true; protocol: Protocol } | { ok: false; error: string }

const MIN_LENGTH = 15

/** The demo check: no account, nothing stored, limited per address. */
export async function checkDemo(taskId: string, answer: string): Promise<DemoResult> {
  const t = await getT()
  const text = String(answer ?? '').trim().slice(0, 6000)
  if (text.length < MIN_LENGTH) return { ok: false, error: t('Write a few lines of the solution first.') }
  const list = await headers()
  const address = (list.get('x-forwarded-for')?.split(',')[0] ?? list.get('x-real-ip') ?? 'unknown').trim()
  if (!(await takeDemoSlot(address))) {
    return { ok: false, error: t('The demo check limit is reached for now. Create a free account to keep checking solutions.') }
  }
  const locale = await getLocale()
  try {
    const protocol = await gradeDemo(taskId, text, locale === 'kk' ? 'kk' : locale === 'en' ? 'en' : 'ru')
    if (!protocol) return { ok: false, error: t('That problem is not part of the demo.') }
    return { ok: true, protocol }
  } catch {
    return { ok: false, error: t('The check is unavailable right now. Please try again in a minute.') }
  }
}
