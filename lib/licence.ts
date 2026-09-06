export type Licence =
  | 'public-domain'
  | 'cc0'
  | 'cc-by'
  | 'cc-by-sa'
  | 'cc-by-nc'
  | 'permission-granted'
  | 'fair-quotation'
  | 'original'
  | 'unknown'

type Info = {
  label: string
  /** Shown next to the material so the terms travel with it. */
  note: string
  /** Whether attribution has to appear wherever the material does. */
  requiresAttribution: boolean
}

export const LICENCES: Record<Licence, Info> = {
  'public-domain': {
    label: 'Public domain',
    note: 'Copyright has expired or been waived. Free to reproduce.',
    requiresAttribution: false,
  },
  cc0: {
    label: 'CC0',
    note: 'Dedicated to the public domain by the author.',
    requiresAttribution: false,
  },
  'cc-by': {
    label: 'CC BY',
    note: 'Free to reuse with credit to the author.',
    requiresAttribution: true,
  },
  'cc-by-sa': {
    label: 'CC BY-SA',
    note: 'Credit required, and anything derived from it must carry the same licence.',
    requiresAttribution: true,
  },
  'cc-by-nc': {
    label: 'CC BY-NC',
    note: 'Credit required, and non-commercial use only — check this before charging for access.',
    requiresAttribution: true,
  },
  'permission-granted': {
    label: 'Used with permission',
    note: 'The rights holder gave written permission for this use.',
    requiresAttribution: true,
  },
  'fair-quotation': {
    label: 'Quoted excerpt',
    note: 'A short extract relied on as quotation. Keep it short and keep the source.',
    requiresAttribution: true,
  },
  original: {
    label: 'Written for OlympAI',
    note: 'Original material.',
    requiresAttribution: false,
  },
  unknown: {
    label: 'Licence not recorded',
    note: 'Nothing is known about the terms. Do not publish this until it is checked.',
    requiresAttribution: true,
  },
}

/** Reachable is not the same as licensed; only these are cleared to reproduce. */
export function isCleared(licence: Licence) {
  return licence !== 'unknown'
}

/**
 * Video id out of any of the shapes YouTube hands out.
 *
 * Returns null for everything else, including other video hosts — the embed is
 * built from the id, never from the URL a row happens to contain, so a crafted
 * link cannot turn into an arbitrary iframe.
 */
export function youTubeId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const host = parsed.hostname.replace(/^www\./, '')
  const valid = (id: string | undefined | null) =>
    id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null

  if (host === 'youtu.be') return valid(parsed.pathname.slice(1))
  if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'youtube-nocookie.com') {
    return null
  }
  if (parsed.pathname === '/watch') return valid(parsed.searchParams.get('v'))

  const [, segment, id] = parsed.pathname.split('/')
  if (segment === 'embed' || segment === 'shorts' || segment === 'live') return valid(id)
  return null
}
