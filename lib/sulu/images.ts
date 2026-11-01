import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * A problem's figures, in the form the model takes them.
 *
 * The grader used to read a circuit problem with no circuit in it, and marked
 * the attempt anyway — against a picture it had never seen, of a circuit the
 * student had in front of them. These are the same files the page shows.
 *
 * Read from disk where the files are on disk (a laptop, `next start`) and sent
 * inline, because a provider cannot fetch from localhost. Where they are not —
 * a serverless function carries no `public/` — the public URL is sent instead,
 * and the provider fetches it from the deployed site.
 */
export type ModelImage = { type: 'input_image'; image_url: string; detail: 'high' }

/** More than this and a long paper's every figure goes on every grade. */
const MAX_IMAGES = 6

const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }

async function one(src: string): Promise<ModelImage | null> {
  if (!src.startsWith('/figures/')) return null
  const mime = MIME[path.extname(src).toLowerCase()]
  if (!mime) return null

  const file = path.join(process.cwd(), 'public', src)
  // `src` came from a statement in the database; a path that climbs out of
  // public/ is not a figure, whatever it is.
  if (!file.startsWith(path.join(process.cwd(), 'public', 'figures') + path.sep)) return null
  try {
    const bytes = await readFile(file)
    return { type: 'input_image', image_url: `data:${mime};base64,${bytes.toString('base64')}`, detail: 'high' }
  } catch {
    const site = process.env.NEXT_PUBLIC_SITE_URL
    if (!site || !site.startsWith('https://')) return null
    return { type: 'input_image', image_url: new URL(src, site).toString(), detail: 'high' }
  }
}

export async function imagesFor(sources: (string | null | undefined)[]) {
  const unique = [...new Set(sources.filter((s): s is string => Boolean(s)))].slice(0, MAX_IMAGES)
  const images = await Promise.all(unique.map(one))
  return images.filter((image): image is ModelImage => image !== null)
}
