#!/usr/bin/env node
/**
 * Applies the SQL files in supabase/migrations that have not run yet.
 *
 * Until now every migration was pasted into the dashboard's SQL editor by hand,
 * which is fine once and a liability by the fourth time: nothing recorded what
 * had already run, so the only way to know was to remember.
 *
 * Applied versions are tracked in supabase_migrations.schema_migrations, the
 * same table the Supabase CLI uses, so the two agree if you ever switch.
 *
 *   node scripts/migrate.mjs            apply everything pending
 *   node scripts/migrate.mjs --dry-run  list what would run
 *   node scripts/migrate.mjs --baseline record every file as applied, run none
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'supabase/migrations')

async function loadEnv() {
  const raw = await readFile(join(ROOT, '.env.local'), 'utf8').catch(() => '')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1)
  }
}

async function main() {
  await loadEnv()
  const url = process.env.SUPABASE_DB_URL
  if (!url) {
    console.error(
      'Missing SUPABASE_DB_URL in .env.local.\n' +
        'Copy it from Project Settings → Database → Connection string (pooler, session mode)\n' +
        'and percent-encode any special characters in the password.',
    )
    process.exit(1)
  }

  const dryRun = process.argv.includes('--dry-run')
  const baseline = process.argv.includes('--baseline')

  const files = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort()
  if (files.length === 0) {
    console.log('No migrations found.')
    return
  }

  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    await client.query('create schema if not exists supabase_migrations')
    await client.query(`
      create table if not exists supabase_migrations.schema_migrations (
        version text primary key,
        name text,
        applied_at timestamptz not null default now()
      )
    `)

    const { rows } = await client.query('select version from supabase_migrations.schema_migrations')
    const applied = new Set(rows.map((r) => r.version))
    const pending = files.filter((f) => !applied.has(f.split('_')[0]))

    if (pending.length === 0) {
      console.log(`Up to date — ${files.length} migration(s), nothing pending.`)
      return
    }

    if (baseline) {
      for (const file of pending) {
        const version = file.split('_')[0]
        await client.query(
          'insert into supabase_migrations.schema_migrations (version, name) values ($1, $2) on conflict do nothing',
          [version, file],
        )
        console.log(`baselined  ${file}`)
      }
      console.log(`\n${pending.length} file(s) recorded as applied. Nothing was executed.`)
      return
    }

    if (dryRun) {
      console.log('Pending:')
      for (const file of pending) console.log('  ', file)
      return
    }

    for (const file of pending) {
      const version = file.split('_')[0]
      const sql = await readFile(join(DIR, file), 'utf8')
      process.stdout.write(`applying   ${file} … `)
      try {
        // One simple query per file: no statement splitting, so dollar-quoted
        // blocks and semicolons inside string literals cannot be mis-parsed.
        await client.query('begin')
        await client.query(sql)
        await client.query(
          'insert into supabase_migrations.schema_migrations (version, name) values ($1, $2)',
          [version, file],
        )
        await client.query('commit')
        console.log('ok')
      } catch (error) {
        await client.query('rollback').catch(() => {})
        console.log('FAILED')
        console.error(`\n${file}:\n  ${error.message}\n`)
        console.error('Nothing from this file was applied; earlier files are committed.')
        process.exitCode = 1
        return
      }
    }
    console.log(`\n${pending.length} migration(s) applied.`)
  } finally {
    await client.end()
  }
}

await main()
