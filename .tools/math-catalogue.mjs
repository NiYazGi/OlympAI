// Run with `node .tools/math-catalogue.mjs`. No live database or network.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const root = new URL('../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const migration = '202611040002_math_olympiads_catalogue.sql'
const db = await PGlite.create({ extensions: { pgcrypto } })
const rows = async (sql, args = []) => (await db.query(sql, args)).rows
const expected = ['gzho', 'kz-national-math', 'kz-regional-math', 'kz-district-math',
  'izho', 'usamo', 'apmo', 'bmo', 'egmo', 'jbmo', 'kz-junior-math',
  'musabayev', 'silk-road', 'west-china', 'tuymaada'].sort()

try {
  await db.exec(read('lib/db/bootstrap.sql'))
  for (const file of readdirSync(fileURLToPath(new URL('supabase/migrations/', root))).sort()) {
    if (!file.endsWith('.sql') || file >= migration) continue
    await db.transaction((tx) => tx.exec(read(`supabase/migrations/${file}`)))
  }
  // An upgrade must keep existing competitions, ids and tracked targets.
  const [user] = await rows(`insert into auth.users (email, encrypted_password)
    values ('catalogue-test@example.test', 'unused') returning id`)
  const [apmo] = await rows(`insert into public.competitions (slug, name, subject_id)
    select 'apmo', 'Existing APMO', id from public.subjects where slug = 'mathematics' returning id`)
  const [physics] = await rows(`insert into public.competitions (slug, name, subject_id)
    select 'physics-test', 'Keep physics', id from public.subjects where slug = 'physics' returning id`)
  await db.query('insert into public.competition_registrations (user_id, competition_id) values ($1, $2)', [user.id, apmo.id])
  await db.query('update public.profiles set target_competition_id = $2 where id = $1', [user.id, apmo.id])
  const before = await rows('select id, problem from public.tasks order by id')
  const apply = () => db.transaction((tx) => tx.exec(read(`supabase/migrations/${migration}`)))
  await apply()
  const catalogue = await rows(`select c.*, d.summary, d.format, d.eligibility, d.route
    from public.competitions c join public.competition_details d on d.competition_id = c.id
    where d.locale = 'ru' order by c.slug`)
  assert.deepEqual(catalogue.map((c) => c.slug), expected)
  for (const entry of catalogue) {
    assert.ok(entry.sources.length > 0)
    for (const source of entry.sources) {
      assert.equal(new URL(source.url).protocol, 'https:')
      assert.ok(source.title.trim())
    }
    assert.equal(new Date(entry.reviewed_on).toISOString().slice(0, 10), '2026-11-04')
    for (const field of ['summary', 'format', 'eligibility', 'route']) assert.ok(entry[field].trim(), `${entry.slug}: ${field}`)
    assert.equal(entry.starts_on, null, 'Do not invent event dates')
  }
  assert.equal((await rows('select id from public.competitions where slug = $1', ['apmo']))[0].id, apmo.id)
  assert.equal((await rows('select name from public.competitions where id = $1', [physics.id]))[0].name, 'Keep physics')
  assert.equal((await rows('select target_competition_id from public.profiles where id = $1', [user.id]))[0].target_competition_id, apmo.id)
  assert.equal((await rows('select * from public.competition_registrations where user_id = $1', [user.id])).length, 1)
  assert.deepEqual(await rows('select id, problem from public.tasks order by id'), before)
  await apply()
  assert.equal((await rows('select competition_id from public.competition_details')).length, 15, 'A rerun must not create duplicates')
  await db.transaction(async (tx) => {
    await tx.exec('set local role authenticated')
    const visible = await tx.query('select sources from public.competitions where slug = $1', ['usamo'])
    assert.equal(visible.rows[0].sources.length, 2)
  })
  console.log('PASS: 15 sourced mathematics olympiads; exclusions absent; existing data/targets preserved; migration is repeatable and readable by students.')
} finally {
  await db.close()
}
