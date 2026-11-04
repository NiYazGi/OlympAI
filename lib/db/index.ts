import 'server-only'

import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite, types } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

/**
 * The database: Postgres itself, compiled to WebAssembly and running inside the
 * Next.js process, with its files under `.data/db`.
 *
 * It replaced the hosted Supabase project. Every query used to be a network
 * round trip — measured at 0.5-1.3 s for auth alone — and a page made several.
 * In-process they cost microseconds, and the schema did not have to change:
 * supabase/migrations apply as they are, RLS policies and triggers included,
 * on top of the few Supabase pieces lib/db/bootstrap.sql recreates.
 *
 * One process owns the directory. Do not point a second server, or a script,
 * at the same OLYMPAI_DB_DIR while the app is running.
 */

const ROOT = process.cwd()
const DATA_DIR = process.env.OLYMPAI_DB_DIR ?? join(ROOT, '.data', 'db')
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations')

/**
 * Values come back in the shapes the Supabase client returned, which is what
 * the rest of the app was written against: timestamps as ISO strings, dates
 * as YYYY-MM-DD, numerics as numbers.
 */
const iso = (value: string) => new Date(value.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00')).toISOString()
const parsers = {
  [types.TIMESTAMPTZ]: iso,
  [types.TIMESTAMP]: (value: string) => iso(`${value}+00`),
  [types.DATE]: (value: string) => value,
  [types.NUMERIC]: (value: string) => Number(value),
  [types.INT8]: (value: string) => Number(value),
}

const holder = globalThis as unknown as { __olympaiDb?: Promise<PGlite> }

/** Opened once per process and kept across dev-server reloads. */
export function getDb(): Promise<PGlite> {
  holder.__olympaiDb ??= open().catch((error) => {
    holder.__olympaiDb = undefined
    throw error
  })
  return holder.__olympaiDb
}

async function open() {
  mkdirSync(DATA_DIR, { recursive: true })
  const db = await PGlite.create({ dataDir: DATA_DIR, extensions: { pgcrypto }, parsers })
  await db.exec(`set timezone = 'UTC'`)
  await migrate(db)
  if (process.env.NODE_ENV === 'development') await seedTestAdmin(db)
  return db
}

/** Applies bootstrap.sql, then every migration not yet recorded, each in its own transaction. */
async function migrate(db: PGlite) {
  await db.exec(readFileSync(join(ROOT, 'lib', 'db', 'bootstrap.sql'), 'utf8'))
  await db.exec(`
    create schema if not exists olympai_meta;
    create table if not exists olympai_meta.migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    );
  `)
  const applied = new Set(
    (await db.query<{ version: string }>('select version from olympai_meta.migrations')).rows.map((row) => row.version),
  )
  const pending = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql') && !applied.has(file))
    .sort()

  for (const file of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    await db.transaction(async (tx) => {
      await tx.exec(sql)
      await tx.query('insert into olympai_meta.migrations (version) values ($1)', [file])
    })
  }
  // Grants for anything created before the default privileges existed.
  if (pending.length) {
    await db.exec(`
      grant usage on all sequences in schema public to anon, authenticated, service_role;
      grant execute on all functions in schema public to anon, authenticated, service_role;
    `)
  }
}

/**
 * The local admin account, development only: username `test`, password
 * `test`, name `test` — and only while the database has no admin at all, so a
 * fresh checkout can get into /admin. Once a real admin exists
 * (`pnpm db:create-admin`), the weak one is never created again.
 */
async function seedTestAdmin(db: PGlite) {
  const exists = await db.query(`select 1 from public.profiles where is_admin or username = 'test' limit 1`)
  if (exists.rows.length) return
  const { hashPassword } = await import('@/lib/db/password')
  await db.transaction(async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `insert into auth.users (email, encrypted_password, raw_user_meta_data)
       values ('test@olympai.local', $1, '{"full_name":"test"}'::jsonb)
       on conflict (email) do update set encrypted_password = excluded.encrypted_password
       returning id`,
      [await hashPassword('test')],
    )
    await tx.query(
      `update public.profiles
         set username = 'test', full_name = 'test', is_admin = true,
             onboarding_completed_at = coalesce(onboarding_completed_at, now())
       where id = $1`,
      [rows[0]!.id],
    )
  })
}
