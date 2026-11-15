// node .tools/topic-route-regression.mjs
// An in-memory fixture; never opens the application's database.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
try {
  await db.exec(`
    create table public.subjects (id text primary key, slug text not null);
    create table public.topics (id text primary key, subject_id text references public.subjects(id), slug text not null, unique(subject_id,slug));
    create table public.tasks (id text primary key, topic_id text references public.topics(id));
    create table public.lessons (id text primary key, topic_id text references public.topics(id));
    create table public.lesson_views (lesson_id text references public.lessons(id), completed_at text);
    insert into public.subjects values ('math','mathematics'),('inf','informatics');
    insert into public.topics values
      ('math-number','math','number-theory'),('math-geometry','math','geometry'),
      ('inf-number','inf','number-theory'),('inf-geometry','inf','geometry'),
      ('math-graphs','math','graphs'),('inf-graphs','inf','graphs');
    insert into public.tasks values ('math-task','math-number'),('inf-task','inf-number');
    insert into public.lessons values ('number-theory-divisibility','math-number');
    insert into public.lesson_views values ('number-theory-divisibility','2026-11-14');
  `)
  const migration = await readFile(new URL('../supabase/migrations/202611160004_unique_topic_routes.sql', import.meta.url), 'utf8')
  await db.exec(migration)
  await db.exec(migration)
  const { rows } = await db.query(`select t.slug, l.id as lesson_id, v.completed_at
    from public.topics t left join public.lessons l on l.topic_id=t.id
    left join public.lesson_views v on v.lesson_id=l.id order by t.slug`)
  assert.deepEqual(rows.map((row) => row.slug), ['geometry','graphs','informatics-geometry','informatics-graphs','informatics-number-theory','number-theory'])
  assert.deepEqual(rows.find((row) => row.slug === 'number-theory'), {
    slug: 'number-theory', lesson_id: 'number-theory-divisibility', completed_at: '2026-11-14',
  }, 'The old Mathematics URL still resolves its lesson and existing progress')
  assert.deepEqual((await db.query(`select t.id, tp.slug from public.tasks t join public.topics tp on tp.id=t.topic_id order by t.id`)).rows,
    [{id:'inf-task',slug:'informatics-number-theory'},{id:'math-task',slug:'number-theory'}], 'Task associations stay in their original subjects')
  await assert.rejects(db.query(`insert into public.topics values ('future-collision','inf','number-theory')`), /topics_route_slug_unique/)
  console.log('PASS: unique topic routes, Mathematics lesson resolution, stable task/progress associations, idempotent migration.')
} finally {
  await db.close()
}
