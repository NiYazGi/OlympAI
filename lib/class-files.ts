import 'server-only'

import { mkdir, rm, stat, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Where a class's handouts live: plain files on the server's disk.
 *
 * The original project kept them in a private Supabase storage bucket and
 * handed out signed links. This deployment has no object store, so the bytes
 * sit next to the database and are served by /api/class-files/[id] only after
 * the row has been read as the person asking — the same check the signed link
 * stood for. Nothing under this folder is reachable by URL on its own.
 *
 * OLYMPAI_FILES_DIR overrides the location; by default it is a `files` folder
 * beside the database directory, so a backup of `.data` takes both.
 */
const CWD = process.cwd()
const DB_DIR = process.env.OLYMPAI_DB_DIR ?? `${CWD}/.data/db`
const ROOT = path.join(process.env.OLYMPAI_FILES_DIR ?? path.join(path.dirname(DB_DIR), 'files'), 'class-files')

export const MAX_FILE_BYTES = 20 * 1024 * 1024

/** What a class hands out: papers, scans, slides, notes. */
export const FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])

/** A stored path, `<class id>/<random>-<name>`, resolved inside ROOT or refused. */
function resolve(stored: string) {
  const full = path.resolve(ROOT, stored)
  if (!full.startsWith(ROOT + path.sep)) throw new Error('Path outside the class files folder')
  return full
}

/** A name safe on any disk, keeping letters of every alphabet. */
export function storedPathFor(classId: string, name: string) {
  const safe = name.normalize('NFKC').replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(-80) || 'file'
  return `${classId}/${crypto.randomUUID().slice(0, 8)}-${safe}`
}

export async function saveClassFile(stored: string, bytes: Uint8Array) {
  const full = resolve(stored)
  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, bytes, { flag: 'wx' })
}

export async function readClassFile(stored: string) {
  return readFile(resolve(stored))
}

export async function classFileExists(stored: string) {
  return stat(resolve(stored)).then(
    (info) => info.isFile(),
    () => false,
  )
}

export async function removeClassFile(stored: string) {
  await rm(resolve(stored), { force: true })
}

/** Everything a class held, when the class itself is deleted. */
export async function deleteClassFolder(classId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(classId)) return
  await rm(resolve(`${classId}/x`).slice(0, -2), { recursive: true, force: true })
}
