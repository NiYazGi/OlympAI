// Run with `node .tools/subjects.mjs`. Uses an isolated, in-memory database.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const root = new URL('../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const migration = '202611040001_math_physics_only.sql'
const db = await PGlite.create({ extensions: { pgcrypto } })
const rows = async (sql, args = []) => (await db.query(sql, args)).rows

try {
  await db.exec(read('lib/db/bootstrap.sql'))
  for (const file of readdirSync(fileURLToPath(new URL('supabase/migrations/', root))).sort()) {
    if (!file.endsWith('.sql') || file >= migration) continue
    await db.transaction((tx) => tx.exec(read(`supabase/migrations/${file}`)))
  }

  // Exercise upgrades with existing accounts, targets, classes and attempts.
  const [user] = await rows(`insert into auth.users (email, encrypted_password)
    values ('subject-test@example.test', 'unused') returning id`)
  const [bio] = await rows(`select s.id, t.id as topic_id from public.subjects s
    join public.topics t on t.subject_id = s.id where s.slug = 'biology' limit 1`)
  const [math] = await rows(`select id from public.subjects where slug = 'mathematics'`)
  const [competition] = await rows(`insert into public.competitions (name, slug, subject_id)
    values ('Biology test', 'biology-test', $1) returning id`, [bio.id])
  await db.query(`update public.profiles set primary_subject = 'Biology',
    onboarding_completed_at = now(), target_subject_id = $2,
    target_competition_id = $3, target_date = '2027-01-01' where id = $1`,
  [user.id, bio.id, competition.id])
  await db.query(`insert into public.tasks (id, subject_id, topic_id, title, problem, difficulty)
    values ('biology-test', $1, $2, 'Biology test', 'Test problem', 1)`, [bio.id, bio.topic_id])
  await db.query(`insert into public.task_attempts (task_id, user_id, answer)
    values ('biology-test', $1, 'Test answer')`, [user.id])
  const [klass] = await rows(`insert into public.classes (teacher_id, name, subject_id)
    values ($1, 'Existing class', $2) returning id`, [user.id, bio.id])
  const [paper] = await rows(`insert into public.mock_tests (user_id, subject_id, task_ids, duration_minutes)
    values ($1, $2, array['biology-test'], 60) returning id`, [user.id, bio.id])
  const [mathUser] = await rows(`insert into auth.users (email, encrypted_password)
    values ('math-test@example.test', 'unused') returning id`)
  await db.query(`update public.profiles set primary_subject = 'Mathematics',
    onboarding_completed_at = now(), target_subject_id = $2, target_date = '2027-01-01'
    where id = $1`, [mathUser.id, math.id])

  // Compare the full retained rows, not just subject/task counts.
  const retained = async () => {
    const data = {}
    data.subjects = await rows(`select * from public.subjects where slug in ('mathematics', 'physics') order by id`)
    const subjects = data.subjects.map((s) => s.id)
    for (const table of ['tasks', 'topics', 'competitions']) {
      data[table] = await rows(`select * from public.${table} where subject_id = any($1::uuid[]) order by id`, [subjects])
    }
    const topics = data.topics.map((t) => t.id)
    for (const table of ['lessons', 'quiz_questions', 'flashcards', 'resources']) {
      data[table] = await rows(`select * from public.${table} where topic_id = any($1::uuid[]) order by id`, [topics])
    }
    data.profile = await rows('select * from public.profiles where id = $1', [mathUser.id])
    return data
  }
  const before = await retained()
  await db.transaction((tx) => tx.exec(read(`supabase/migrations/${migration}`)))

  assert.deepEqual(await retained(), before, 'Mathematics and physics data must stay intact')
  assert.deepEqual((await rows('select slug from public.subjects order by slug')).map((s) => s.slug),
    ['mathematics', 'physics'])
  const [profile] = await rows(`select primary_subject, onboarding_completed_at,
    target_subject_id, target_competition_id, target_date from public.profiles where id = $1`, [user.id])
  assert.ok(Object.values(profile).every((v) => v === null), 'Removed subject and goal must be cleared')
  assert.equal((await rows('select * from public.tasks where id = $1', ['biology-test'])).length, 0)
  assert.equal((await rows('select * from public.task_attempts where user_id = $1', [user.id])).length, 0)
  assert.equal((await rows('select * from public.mock_tests where id = $1', [paper.id])).length, 0)
  assert.equal((await rows('select * from public.competitions where id = $1', [competition.id])).length, 0)
  assert.equal((await rows('select subject_id from public.classes where id = $1', [klass.id]))[0].subject_id, null)
  for (const table of ['lessons', 'quiz_questions', 'flashcards', 'resources']) {
    assert.equal((await rows(`select * from public.${table} where topic_id = $1`, [bio.topic_id])).length, 0)
  }
  await assert.rejects(db.query(`insert into public.subjects (name, slug) values ('Biology', 'biology')`), { code: '23514' })
  await assert.rejects(db.query(`update public.profiles set primary_subject = 'Biology' where id = $1`, [user.id]), { code: '23514' })
  console.log('PASS: only mathematics and physics remain; retained data is unchanged; removed content and targets are cleared.')
} finally {
  await db.close()
}
