import 'server-only'

import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

export type Announcement = {
  text: string
  tone: 'info' | 'warning'
  /** ISO date after which the banner stops showing; null for no end. */
  until: string | null
}

export type SiteSettings = {
  announcement: Announcement | null
  signupsOpen: boolean
}

const DEFAULTS: SiteSettings = { announcement: null, signupsOpen: true }

/**
 * The switches the admin panel owns, read once per request. A failed read
 * falls back to the defaults: the site must not go down because a banner
 * could not be loaded.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const { data } = await createAdminClient().from('site_settings').select('key, value')
    const byKey = new Map((data ?? []).map((row) => [row.key, row.value]))
    const raw = byKey.get('announcement') as Partial<Announcement> | null | undefined
    const announcement =
      raw && typeof raw.text === 'string' && raw.text.trim()
        ? {
            text: raw.text,
            tone: raw.tone === 'warning' ? ('warning' as const) : ('info' as const),
            until: typeof raw.until === 'string' ? raw.until : null,
          }
        : null
    const signups = byKey.get('signups_open') as { open?: unknown } | null | undefined
    return { announcement, signupsOpen: signups?.open !== false }
  } catch (cause) {
    console.error('[site-settings]', cause)
    return DEFAULTS
  }
})

/** The banner, if one is set and has not run out. */
export async function getLiveAnnouncement() {
  const { announcement } = await getSiteSettings()
  if (!announcement) return null
  if (announcement.until && announcement.until < new Date().toISOString().slice(0, 10)) return null
  return announcement
}
