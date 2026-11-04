// Run with `node .tools/physics-catalogue.mjs`. Isolated in-memory database.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const root = new URL('../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const migration = '202611040003_physics_and_imo_catalogue.sql'
const physicsSlugs = ['graviton-physics', 'kz-national-physics', 'kz-regional-physics',
  'kz-district-physics', 'apho', 'bpo', 'eupho', 'ipho', 'izho-physics', 'nbpho',
  'belpho', 'belpho-regional', 'cpho', 'seagull-physics', 'kz-junior-physics', 'kbo-physics'].sort()
const db = await PGlite.create({ extensions: { pgcrypto } })
const rows = async (sql, args = []) => (await db.query(sql, args)).rows

try {
  await db.exec(read('lib/db/bootstrap.sql'))
  for (const file of readdirSync(fileURLToPath(new URL('supabase/migrations/', root))).sort()) {
    if (!file.endsWith('.sql') || file >= migration) continue
    await db.transaction((tx) => tx.exec(read(`supabase/migrations/${file}`)))
  }
  const beforeTasks = await rows('select id, problem from public.tasks order by id')
  const oldMath = await rows('select id, slug from public.competitions order by slug')
  const [user] = await rows(`insert into auth.users (email, encrypted_password)
    values ('physics-catalogue-test@example.test', 'unused') returning id`)
  const [existingIpho] = await rows(`insert into public.competitions (slug, name, subject_id)
    select 'ipho', 'Existing IPhO', id from public.subjects where slug = 'physics' returning id`)
  const [custom] = await rows(`insert into public.competitions (slug, name, subject_id)
    select 'keep-custom', 'My competition', id from public.subjects where slug = 'physics' returning id`)
  const target = oldMath.find((c) => c.slug === 'kz-national-math')
  await db.query('update public.profiles set target_competition_id = $2 where id = $1', [user.id, target.id])
  await db.query(`insert into public.competition_registrations (user_id, competition_id)
    values ($1, $2), ($1, $3)`, [user.id, target.id, existingIpho.id])

  const apply = () => db.transaction((tx) => tx.exec(read(`supabase/migrations/${migration}`)))
  await apply()
  const catalogue = await rows(`select c.*, s.slug as subject_slug, d.summary, d.format, d.eligibility, d.route
    from public.competitions c join public.subjects s on s.id = c.subject_id
    join public.competition_details d on d.competition_id = c.id and d.locale = 'ru' order by c.slug`)
  assert.equal(catalogue.length, 32)
  assert.deepEqual(catalogue.filter((c) => c.subject_slug === 'physics').map((c) => c.slug), physicsSlugs)
  assert.equal(catalogue.filter((c) => c.subject_slug === 'mathematics').length, 16)
  assert.equal(catalogue.find((c) => c.slug === 'imo').subject_slug, 'mathematics')
  assert.equal(catalogue.find((c) => c.slug === 'usamo').level, 'International')
  assert.match(catalogue.find((c) => c.slug === 'usamo').summary, /Национальная/)
  for (const c of catalogue.filter((c) => c.subject_slug === 'physics' || c.slug === 'imo')) {
    for (const field of ['summary', 'format', 'eligibility', 'route']) assert.ok(c[field]?.trim(), `${c.slug}: ${field}`)
    assert.equal(c.starts_on, null)
    assert.ok(c.sources.length > 0)
    assert.ok(c.sources.every((source) => source.title.trim() && new URL(source.url).protocol === 'https:'))
    assert.equal(new Date(c.reviewed_on).toISOString().slice(0, 10), '2026-11-04')
    assert.doesNotMatch(c.name, /Всероссийск|Beyond|сборы/i)
    assert.notEqual(c.region, 'Россия')
  }
  for (const prefix of ['kz-national', 'kz-regional', 'kz-district', 'kz-junior']) {
    assert.match(catalogue.find((c) => c.slug === `${prefix}-math`).name, /математике/)
    assert.match(catalogue.find((c) => c.slug === `${prefix}-physics`).name, /физике/)
  }
  for (const original of oldMath) assert.equal(catalogue.find((c) => c.slug === original.slug).id, original.id)
  assert.equal(catalogue.find((c) => c.slug === 'ipho').id, existingIpho.id)
  assert.equal((await rows('select name from public.competitions where id = $1', [custom.id]))[0].name, 'My competition')
  assert.equal((await rows('select target_competition_id from public.profiles where id = $1', [user.id]))[0].target_competition_id, target.id)
  assert.equal((await rows('select * from public.competition_registrations where user_id = $1', [user.id])).length, 2)
  assert.deepEqual(await rows('select id, problem from public.tasks order by id'), beforeTasks)
  await apply()
  assert.equal((await rows('select competition_id from public.competition_details')).length, 32)
  console.log('PASS: 16 physics + 16 mathematics entries; correct subjects/names; requested USAMO category; sources, exclusions, ids and tracked goals verified; no duplicates on rerun.')
} finally {
  await db.close()
}
