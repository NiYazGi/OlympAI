// Run only after stopping the isolated test server. Never opens the real app DB.
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { getDb } from '../lib/db/index.ts'
import { trainingToday } from '../lib/training-time.ts'

const directory = resolve(process.env.OLYMPAI_DB_DIR ?? '')
assert.match(directory, /\/olympai-training-[^/]+\/db$/, 'Use a dedicated olympai-training-* temporary DB')
assert(!directory.includes('/.data/'), 'The live DB is not a test fixture')
const db = await getDb()
try {
  const user = (await db.query("select id from public.profiles where username='trainingcheck'")).rows[0]
  assert(user, 'Create the isolated trainingcheck fixture first')
  const { rows: sessions } = await db.query(`select * from public.preparation_sessions where user_id=$1 and plan_version='time-budget-v3'`, [user.id])
  const active = sessions.filter((row) => !row.completed_at && !row.skipped_at && !row.superseded_at)
  assert(active.length > 0)
  const dates = new Set()
  for (const row of active) {
    assert(!dates.has(row.on_date), 'Only one active assignment per day, including old scopes')
    dates.add(row.on_date)
    assert(row.minutes <= row.budget_minutes)
    if (row.session_kind !== 'mock') {
      assert.equal(row.minutes, row.lesson_minutes + row.quiz_minutes + row.review_minutes + row.task_minutes.reduce((a, b) => a + b, 0))
      assert.equal(row.task_ids.length, row.task_minutes.length)
      assert.equal(row.task_ids.length, row.task_parts.length)
      assert.equal(row.task_ids.length, row.task_part_totals.length)
    }
  }
  const history = (await db.query('select personal_why from public.preparation_goal_history where user_id=$1 order by created_at', [user.id])).rows
  assert(history.length >= 2, 'Goal edits keep previous versions')
  assert(new Set(history.map((row) => row.personal_why)).size >= 2)
  const diagnostic = (await db.query('select result,answers from public.preparation_diagnostics where user_id=$1 and completed_at is not null', [user.id])).rows
  assert(diagnostic.length > 0, 'Diagnostic survives a server restart')
  assert(Object.keys(diagnostic[0].answers).length >= 8)
  for (const viewer of [user.id, '00000000-0000-0000-0000-000000000001']) {
    await db.transaction(async (tx) => {
      await tx.exec('set local role authenticated')
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [viewer])
      for (const table of ['preparation_goal_history', 'preparation_diagnostics']) {
        const count = Number((await tx.query(`select count(*) as count from public.${table}`)).rows[0].count)
        assert(viewer === user.id ? count > 0 : count === 0, `${table}: private owner-only reads`)
        const grants = (await tx.query('select has_table_privilege(current_user,$1,\'insert\') as allowed', [`public.${table}`])).rows[0]
        assert.equal(grants.allowed, false, 'Answers and history are server-written')
      }
    })
  }
  if (process.argv.includes('--seed-missed')) {
    const today = trainingToday()
    const future = active.find((row) => row.on_date > today)
    assert(future)
    const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86400000).toISOString().slice(0, 10)
    await db.query(`insert into public.preparation_sessions(user_id,scope,goal_key,plan_version,on_date,minutes,budget_minutes,phase,session_kind,review_minutes,task_ids)
      values($1,$2,$3,'time-budget-v3',$4,10,10,'foundation','review',10,'{}')`, [user.id, future.scope, future.goal_key, yesterday])
    console.log('Seeded one missed-day fixture; refresh /dashboard twice, then run --verify-missed.')
  }
  if (process.argv.includes('--verify-missed')) {
    const past = sessions.filter((row) => row.on_date < trainingToday() && !row.superseded_at)
    assert(past.some((row) => row.skipped_at), 'Missed work is marked rescheduled')
    assert(!active.some((row) => row.on_date < trainingToday()), 'No overdue active assignment accumulates')
    const finished = sessions.find((row) => row.completed_at && row.lesson_minutes > 0)
    assert(finished, 'Completed sessions remain in history')
    const lesson = (await db.query('select estimated_minutes from public.lessons where id=$1', [finished.lesson_id])).rows[0]
    const read = sessions.filter((row) => row.lesson_id === finished.lesson_id && (row.completed_at || row.lesson_completed_at)).reduce((sum, row) => sum + row.lesson_minutes, 0)
    if (read < lesson.estimated_minutes) {
      const view = (await db.query('select completed_at from public.lesson_views where user_id=$1 and lesson_id=$2', [user.id, finished.lesson_id])).rows[0]
      assert(!view?.completed_at, 'Reading one timed part does not mark the whole lesson read')
    }
    assert(!active.some((row) => row.on_date === trainingToday()), 'Finishing a day does not refill it with another assignment')
  }
  console.log(`Persistence checks passed: ${active.length} active days, ${history.length} goal versions, private baseline and balanced allocations.`)
} finally {
  await db.exec('checkpoint')
  await db.close()
}
