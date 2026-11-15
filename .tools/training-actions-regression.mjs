// node --import ./.tools/register.mjs .tools/training-actions-regression.mjs
// Uses only an in-memory database. No account data, grader or Telegram calls.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { reserveTrainingActivity, syncTimedLessonCompletion } from '../lib/training-mutations.ts'

const db = new PGlite()
const today = '2026-11-15'
const quiz = { userId: 'a', sessionId: 'quiz', goalKey: 'goal-a', today, kind: 'quiz', questionId: 'q1' }
const mock = { userId: 'a', sessionId: 'mock', goalKey: 'goal-a', today, kind: 'mock', mockKey: 'mock-1' }
try {
  await db.exec(`create table public.preparation_sessions (
    id text primary key,user_id text not null,goal_key text not null,on_date date not null,
    started_at timestamptz,completed_at timestamptz,skipped_at timestamptz,superseded_at timestamptz,
    session_kind text not null default 'study',quiz_minutes int not null default 0,
    question_ids text[] not null default '{}',task_ids text[] not null default '{}',mock_key text,
    lesson_id text,lesson_minutes int not null default 0,lesson_completed_at timestamptz);
    create table public.quiz_attempts(id text primary key);
    create table public.mock_tests(id text primary key);
    create table public.lessons(id text primary key,estimated_minutes int not null);
    create table public.lesson_views(user_id text,lesson_id text,completed_at timestamptz,primary key(user_id,lesson_id));
    insert into public.preparation_sessions(id,user_id,goal_key,on_date,quiz_minutes,question_ids) values ('quiz','a','goal-a','2026-11-15',10,'{q1,q2}');
    insert into public.preparation_sessions(id,user_id,goal_key,on_date,session_kind,mock_key) values ('mock','a','goal-a','2026-11-15','mock','mock-1');
    insert into public.preparation_sessions(id,user_id,goal_key,on_date,task_ids) values ('task','a','goal-a','2026-11-15','{t1}');
    insert into public.mock_tests values ('duplicate');`)
  const xpMigration = await readFile(new URL('../supabase/migrations/202611090001_avatars_and_lesson_xp.sql', import.meta.url), 'utf8')
  await db.exec(xpMigration.slice(xpMigration.indexOf('alter table public.lesson_views')))
  const reserve = (input) => db.transaction((tx) => reserveTrainingActivity(tx, input))
  for (const invalid of [{ userId: 'b' }, { goalKey: 'old-goal' }, { today: '2026-11-16' }, { questionId: 'unrelated' }]) {
    assert.equal(await reserve({ ...quiz, ...invalid }), false)
  }
  assert.equal((await db.query("select started_at from public.preparation_sessions where id='quiz'")).rows[0].started_at, null)
  assert.equal(await reserve(quiz), true)
  const firstStart = (await db.query("select started_at from public.preparation_sessions where id='quiz'")).rows[0].started_at
  assert(firstStart, 'First quiz answer reserves its daily timebox before any later plan refresh')
  assert.equal(await reserve(quiz), true)
  assert.equal(String((await db.query("select started_at from public.preparation_sessions where id='quiz'")).rows[0].started_at), String(firstStart))
  await db.query("update public.preparation_sessions set skipped_at=now() where id='quiz'")
  await assert.rejects(db.transaction(async (tx) => {
    if (!await reserveTrainingActivity(tx, quiz)) throw new Error('Study day closed')
    await tx.query("insert into public.quiz_attempts values ('must-not-save')")
  }), /Study day closed/)
  assert.equal((await db.query('select count(*)::int as n from public.quiz_attempts')).rows[0].n, 0)
  await assert.rejects(db.transaction(async (tx) => {
    assert.equal(await reserveTrainingActivity(tx, mock), true)
    await tx.query("insert into public.mock_tests values ('duplicate')")
  }), /duplicate key/)
  assert.equal((await db.query("select started_at from public.preparation_sessions where id='mock'")).rows[0].started_at, null, 'Failed mock creation rolls back its reservation')
  assert.equal(await reserve(mock), true)
  assert.equal(await reserve({ userId: 'a', sessionId: 'task', goalKey: 'goal-a', today, kind: 'task', taskId: 't1' }), true)
  for (const column of ['completed_at', 'skipped_at', 'superseded_at']) {
    await db.query(`update public.preparation_sessions set ${column}=now() where id='task'`)
    assert.equal(await reserve({ userId: 'a', sessionId: 'task', goalKey: 'goal-a', today, kind: 'task', taskId: 't1' }), false)
    await db.query(`update public.preparation_sessions set ${column}=null where id='task'`)
  }

  await db.exec(`insert into public.lessons values ('lesson',25);
    insert into public.preparation_sessions(id,user_id,goal_key,on_date,lesson_id,lesson_minutes,lesson_completed_at) values
      ('part1','a','goal-a','2026-11-14','lesson',10,now()),('part2','a','goal-a','2026-11-15','lesson',15,null),
      ('other-user','b','goal-a','2026-11-14','lesson',100,now()),('other-goal','a','goal-b','2026-11-14','lesson',100,now());`)
  const lesson = { userId: 'a', goalKey: 'goal-a', lessonId: 'lesson' }
  await db.transaction((tx) => syncTimedLessonCompletion(tx, { ...lesson, complete: true }))
  assert.equal((await db.query('select count(*)::int as n from public.lesson_views')).rows[0].n, 0, 'A part, another user and another goal cannot finish this lesson')
  await db.query("update public.preparation_sessions set lesson_completed_at=now() where id='part2'")
  await db.transaction((tx) => syncTimedLessonCompletion(tx, { ...lesson, complete: true }))
  const firstRead = (await db.query("select * from public.lesson_views where user_id='a'")).rows[0]
  assert(firstRead.completed_at)
  await db.query("update public.preparation_sessions set lesson_completed_at=null where id='part2'")
  await db.transaction((tx) => syncTimedLessonCompletion(tx, { ...lesson, complete: false }))
  const undone = (await db.query("select * from public.lesson_views where user_id='a'")).rows[0]
  assert.equal(undone.completed_at, null, 'Undoing the final timed part clears the whole-lesson read flag')
  assert.equal(String(undone.first_completed_at), String(firstRead.first_completed_at), 'First-completion XP history survives undo')
  await db.query("update public.preparation_sessions set lesson_completed_at=now() where id='part2'")
  await db.transaction((tx) => syncTimedLessonCompletion(tx, { ...lesson, complete: true }))
  assert.equal(String((await db.query("select first_completed_at from public.lesson_views where user_id='a'")).rows[0].first_completed_at), String(firstRead.first_completed_at))
  console.log('PASS: atomic quiz/mock/task reservations, closed/foreign/future guards, rollback, timed lesson undo and first-completion history.')
} finally {
  await db.close()
}
