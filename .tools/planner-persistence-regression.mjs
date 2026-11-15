// node --import ./.tools/register.mjs .tools/planner-persistence-regression.mjs
// Runs the real persistence/replanning function against in-memory Postgres.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { register } from 'node:module'
import { PGlite, types } from '@electric-sql/pglite'
import { EMPTY_DAY } from '../lib/day-state.ts'

register(new URL('./planner-persistence-hooks.mjs', import.meta.url))
const db = new PGlite({ parsers: { [types.DATE]: (value) => value, [types.TIMESTAMPTZ]: (value) => new Date(value).toISOString() } })
globalThis.__plannerFixtureDb = db
const { getDailyPreparation } = await import('../lib/supabase/daily-preparation.ts')
const owner = '00000000-0000-0000-0000-000000000001'
const prefix = 'fixture-goal:'
const topic = { id: '00000000-0000-0000-0000-000000000002', name: 'Mechanics', slug: 'mechanics', position: 0, mastery: 50,
  lesson: { id: 'fixture-lesson', title: 'Mechanics', minutes: 25, completedAt: null }, quiz: null, questionIds: [] }
const input = {
  today: '2026-11-16', targetDate: '2026-12-10', goalStart: '2026-11-16T00:00:00Z',
  competitionSlug: null, competitionLevel: 'National', subject: 'Physics', grade: 'Grade 9–10', level: 'Building momentum',
  preferences: { weekdays: [0, 1, 2, 3, 4, 5, 6], sessionMinutes: 30, schoolGrade: 10, dailyTasks: 5, reviewPercent: 20 },
  day: EMPTY_DAY, topics: [topic], tasks: [{ id: 'fixture-task', title: 'Practice', subject: 'Physics', topic: 'Mechanics',
    difficulty: 3, estimatedMinutes: 25, gradeMin: 10, gradeMax: 10, solved: false, paper: null }], completedTasks: new Map(), mocks: [],
}
const scope = createHash('sha256').update(JSON.stringify([prefix, input.targetDate, input.preferences, 'time-budget-v3'])).digest('hex')
try {
  await db.exec(`create table public.preparation_sessions (
    id uuid primary key default gen_random_uuid(), user_id uuid not null, scope text not null, goal_key text not null, plan_version text not null,
    on_date date not null, topic_id uuid, lesson_id text, task_ids text[] not null default '{}', question_ids text[] not null default '{}',
    minutes int not null, mock_key text, full_paper boolean not null default false, phase text not null default 'foundation', session_kind text not null default 'study',
    budget_minutes int, lesson_minutes int not null default 0, task_minutes int[] not null default '{}', quiz_minutes int not null default 0,
    review_minutes int not null default 0, lesson_part int not null default 0, lesson_parts int not null default 0,
    task_parts int[] not null default '{}', task_part_totals int[] not null default '{}', quiz_part int not null default 0, quiz_parts int not null default 0,
    review_mock_key text, review_part int not null default 0, review_parts int not null default 0, created_at timestamptz not null default now(),
    started_at timestamptz, completed_at timestamptz, skipped_at timestamptz, superseded_at timestamptz, actual_minutes int, reflection text,
    lesson_completed_at timestamptz, quiz_completed_at timestamptz
  );
  create unique index one_active on public.preparation_sessions(user_id,scope,on_date) where completed_at is null and skipped_at is null and superseded_at is null;
  create table public.preparation_plan_state(user_id uuid,scope text,fingerprint text,updated_at timestamptz default now(),primary key(user_id,scope));`)

  const insert = async (fields) => {
    const values = { user_id: owner, scope, goal_key: prefix, plan_version: 'time-budget-v3', on_date: input.today, ...fields }
    const keys = Object.keys(values)
    return (await db.query(`insert into public.preparation_sessions (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning id`, Object.values(values))).rows[0].id
  }
  const mockId = await insert({ minutes: 30, budget_minutes: 30, mock_key: 'mock-1', session_kind: 'mock', task_ids: ['fixture-task'] })
  const openPaper = { id: 'paper-1', key: 'mock-1', taskIds: ['fixture-task'], minutes: 30, startedAt: input.today + 'T10:00:00Z', completedAt: null, reviewedAt: null, missedTaskIds: [] }
  const withMock = { ...input, mocks: [openPaper] }
  let plan = await getDailyPreparation(withMock, [topic], prefix)
  assert(plan.sessions.some((row) => row.id === mockId && row.started_at && !row.superseded_at), 'An open paper locks its route session even when opened without the dashboard start action')
  assert.equal(plan.sessions.filter((row) => row.on_date === input.today && !row.completed_at && !row.skipped_at && !row.superseded_at).length, 1)
  plan = await getDailyPreparation(withMock, [topic], prefix)
  assert.equal(plan.replanned, false, 'Refreshing an open mock does not repeatedly regenerate the plan')

  await db.exec('truncate public.preparation_sessions,public.preparation_plan_state')
  const started = await insert({ minutes: 10, budget_minutes: 30, topic_id: topic.id, lesson_id: topic.lesson.id, lesson_minutes: 8, review_minutes: 2, started_at: input.today + 'T09:00:00Z' })
  const studyInput = { ...input, mocks: [{ ...openPaper, key: 'unrelated-open', taskIds: ['outside-pool'] }] }
  plan = await getDailyPreparation(studyInput, [topic], prefix)
  assert(plan.sessions.some((row) => row.id === started && !row.superseded_at))
  const active = plan.sessions.filter((row) => !row.completed_at && !row.skipped_at && !row.superseded_at)
  assert.equal(active.filter((row) => row.on_date === input.today).length, 1)
  assert.equal(active.reduce((sum, row) => sum + row.lesson_minutes, 0), 25, 'Spare room in a locked day cannot swallow future lesson chunks through ON CONFLICT')
  assert.equal(active.reduce((sum, row) => sum + row.task_minutes.reduce((a, b) => a + b, 0), 0), 25, 'Every future task chunk has its full allocation')
  const ids = active.map((row) => row.id)
  const refreshed = await getDailyPreparation(studyInput, [topic], prefix)
  assert.equal(refreshed.replanned, false)
  assert.deepEqual(refreshed.sessions.filter((row) => !row.completed_at && !row.skipped_at && !row.superseded_at).map((row) => row.id), ids)
  await db.exec('truncate public.preparation_sessions,public.preparation_plan_state')
  const quizTopic = { ...topic, lesson: null, quiz: { minutes: 30, completedAt: null }, questionIds: Array.from({ length: 15 }, (_, i) => `legacy-q-${i}`) }
  const legacy = await insert({ minutes: 6, budget_minutes: 30, topic_id: topic.id, quiz_minutes: 4, review_minutes: 2,
    question_ids: quizTopic.questionIds, quiz_part: 1, quiz_parts: 2, started_at: input.today + 'T09:00:00Z' })
  const migrated = await getDailyPreparation({ ...studyInput, topics: [quizTopic] }, [quizTopic], prefix)
  assert(migrated.sessions.some((row) => row.id === legacy && row.skipped_at), 'An old running chunk with the entire quiz is safely replanned')
  assert(!migrated.sessions.some((row) => row.on_date === input.today && !row.skipped_at && !row.completed_at && !row.superseded_at), 'Repairing an old running quiz does not assign extra work today')
  assert.deepEqual(migrated.sessions.filter((row) => !row.skipped_at && !row.completed_at && !row.superseded_at).flatMap((row) => row.question_ids), quizTopic.questionIds, 'Correct question chunks replace the old duplicate set')
  console.log('PASS: open mock reservation, one active assignment per day, full chunk persistence and stable refreshes (isolated in-memory Postgres).')
} finally {
  delete globalThis.__plannerFixtureDb
  await db.close()
}
