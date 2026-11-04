#!/usr/bin/env node
/**
 * The local database, from the command line. Stop the app first: one process
 * owns the data directory at a time.
 *
 *   node scripts/db.mjs status                 list applied and pending migrations
 *   node scripts/db.mjs migrate                apply pending migrations without starting the app
 *   node scripts/db.mjs reset                  delete the database; the app rebuilds it on next start
 *   node scripts/db.mjs create-admin <login>   create an admin with a random 32-character password
 *
 * Migrations need no command of their own — the app applies pending ones when
 * it opens the database (lib/db/index.ts). create-admin applies them too, the
 * same way, so it works on a database the app has never opened.
 */
import { randomBytes, randomInt, scrypt as scryptCallback } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = process.env.OLYMPAI_DB_DIR ?? join(ROOT, '.data', 'db')
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations')
const command = process.argv[2] ?? 'status'

const scrypt = promisify(scryptCallback)

/** Same format as lib/db/password.ts: `scrypt$<salt>$<hash>` in hex, 64-byte key. */
async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

/** Letters and digits only, so it survives copy-paste and shell quoting. Unbiased. */
function randomPassword(length = 32) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('')
}

/** Mirrors migrate() in lib/db/index.ts. */
async function migrate(db) {
  await db.exec(readFileSync(join(ROOT, 'lib', 'db', 'bootstrap.sql'), 'utf8'))
  await db.exec(`
    create schema if not exists olympai_meta;
    create table if not exists olympai_meta.migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    );
  `)
  const applied = new Set((await db.query('select version from olympai_meta.migrations')).rows.map((r) => r.version))
  const pending = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql') && !applied.has(f)).sort()
  for (const file of pending) {
    await db.transaction(async (tx) => {
      await tx.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
      await tx.query('insert into olympai_meta.migrations (version) values ($1)', [file])
    })
  }
  if (pending.length) {
    await db.exec(`
      grant usage on all sequences in schema public to anon, authenticated, service_role;
      grant execute on all functions in schema public to anon, authenticated, service_role;
    `)
  }
  return pending.length
}

if (command === 'migrate') {
  mkdirSync(DATA_DIR, { recursive: true })
  const db = await PGlite.create({ dataDir: DATA_DIR, extensions: { pgcrypto } })
  await db.exec(`set timezone = 'UTC'`)
  console.log(`Applied ${await migrate(db)} migration(s) to ${DATA_DIR}.`)
  await db.close()
} else if (command === 'reset') {
  rmSync(DATA_DIR, { recursive: true, force: true })
  console.log(`Deleted ${DATA_DIR}. It is recreated, migrated and seeded on the next start.`)
} else if (command === 'status') {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
  let applied = new Set()
  if (existsSync(DATA_DIR)) {
    const db = await PGlite.create({ dataDir: DATA_DIR })
    const exists = await db.query(`select to_regclass('olympai_meta.migrations') is not null as ok`)
    if (exists.rows[0].ok) {
      applied = new Set((await db.query('select version from olympai_meta.migrations')).rows.map((r) => r.version))
    }
    await db.close()
  }
  for (const file of files) console.log(`${applied.has(file) ? 'applied' : 'pending'}  ${file}`)
  console.log(`\n${DATA_DIR}`)
} else if (command === 'create-admin') {
  const login = (process.argv[3] ?? '').trim().toLowerCase()
  if (!/^[a-z0-9_.-]{3,40}$/.test(login)) {
    console.error('Usage: node scripts/db.mjs create-admin <login>   (3-40 of a-z 0-9 _ . -)')
    process.exit(1)
  }
  mkdirSync(DATA_DIR, { recursive: true })
  const db = await PGlite.create({ dataDir: DATA_DIR, extensions: { pgcrypto } })
  await db.exec(`set timezone = 'UTC'`)
  const migrated = await migrate(db)
  if (migrated) console.log(`Applied ${migrated} migration(s).`)

  const taken = await db.query(`select 1 from public.profiles where lower(username) = $1`, [login])
  if (taken.rows.length) {
    console.error(`An account with the login "${login}" already exists. Nothing changed.`)
    await db.close()
    process.exit(1)
  }

  const password = randomPassword()
  const email = `${login}@olympai.local`
  await db.transaction(async (tx) => {
    // handle_new_user (first migration) creates the profile row.
    const { rows } = await tx.query(
      `insert into auth.users (email, encrypted_password, raw_user_meta_data)
       values ($1, $2, $3) returning id`,
      [email, await hashPassword(password), JSON.stringify({ full_name: login })],
    )
    await tx.query(
      `update public.profiles
          set username = $2, full_name = $2, is_admin = true, onboarding_completed_at = now()
        where id = $1`,
      [rows[0].id, login],
    )
  })
  await db.close()

  // The password is shown once, here, and kept in a file that git ignores
  // (.data/ and credentials* are both in .gitignore). Move it somewhere safe
  // and delete the file.
  const file = join(ROOT, '.data', `credentials-${login}.txt`)
  writeFileSync(file, `login: ${login}\nemail: ${email}\npassword: ${password}\n`, { mode: 0o600 })
  console.log(`Created admin "${login}" (${email}).`)
  console.log(`Password written to ${file}`)
} else {
  console.error('Usage: node scripts/db.mjs status|migrate|reset|create-admin <login>')
  process.exit(1)
}
