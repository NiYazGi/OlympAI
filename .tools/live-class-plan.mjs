/**
 * A teacher's own plan for a class, against the live database.
 *
 * Saves a plan through save_class_plan as a signed-in teacher — one section
 * left out, one with a deadline, a note and three hand-picked problems — then
 * checks what each account may read and write, and builds the student's route
 * from what the student can see, with the same buildPath the pages use.
 *
 * Creates three throwaway accounts and deletes them again.
 *
 *   node --import ./.tools/register.mjs .tools/live-class-plan.mjs [--keep]
 */
import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const ROOT = '/Users/niya/Desktop/olympAI'
const KEEP = process.argv.includes('--keep')

const raw = await readFile(`${ROOT}/.env.local`, 'utf8')
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
}

const { createAdminClient } = await import('@/lib/supabase/admin')
const { buildPath, DEFAULT_TARGET } = await import('@/lib/path')
const admin = createAdminClient()

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

let failures = 0
const ok = (label, condition, detail = '') => {
  console.log(`${condition ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}
const section = (title) => console.log(`\n${title}\n${'-'.repeat(title.length)}`)

const stamp = Date.now()
const PASSWORD = `plan-${stamp}-${Math.random().toString(36).slice(2)}`
const made = []

async function makeUser(email, metadata) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  })
  if (error) throw new Error(`${email}: ${error.message}`)
  made.push(data.user.id)
  return data.user
}

async function sessionFor(email) {
  const client = createClient(URL, KEY, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`sign in ${email}: ${error.message}`)
  return client
}

try {
  section('accounts and a class')
  const teacher = await makeUser(`plan-teacher+${stamp}@olympai.test`, { full_name: 'Plan Teacher', role: 'teacher' })
  const other = await makeUser(`plan-other+${stamp}@olympai.test`, { full_name: 'Other Teacher', role: 'teacher' })
  const student = await makeUser(`plan-student+${stamp}@olympai.test`, { full_name: 'Plan Student' })
  const asTeacher = await sessionFor(teacher.email)
  const asOther = await sessionFor(other.email)
  const asStudent = await sessionFor(student.email)

  const { data: maths } = await admin.from('subjects').select('id').eq('slug', 'mathematics').single()
  const { data: klass, error: classError } = await asTeacher
    .from('classes')
    .insert({ teacher_id: teacher.id, name: 'Plan test', subject_id: maths.id })
    .select('id')
    .single()
  ok('teacher creates a mathematics class', Boolean(klass), classError?.message ?? '')
  await admin.from('class_members').insert({ class_id: klass.id, student_id: student.id })

  const { data: topics } = await admin
    .from('topics')
    .select('id, name, slug, position')
    .eq('subject_id', maths.id)
    .order('position')
  const algebra = topics.find((topic) => topic.slug === 'algebra')
  const geometry = topics.find((topic) => topic.slug === 'geometry')
  // Three algebra problems, deliberately not the easiest first.
  const { data: hard } = await admin
    .from('tasks')
    .select('id')
    .eq('topic_id', algebra.id)
    .order('difficulty', { ascending: false })
    .order('id')
    .limit(3)
  const picks = hard.map((row) => row.id)

  section('saving a plan')
  const sections = topics.map((topic, index) => ({
    topic_id: topic.id,
    position: index + 1,
    target: null,
    skipped: topic.id === geometry.id,
    due_date: topic.id === algebra.id ? '2026-12-20' : null,
    note: topic.id === algebra.id ? 'Глава 3 учебника. В пятницу проверочная.' : null,
  }))
  const chosen = picks.map((id, n) => ({ topic_id: algebra.id, task_id: id, position: n + 1 }))

  const { error: saveError } = await asTeacher.rpc('save_class_plan', { plan_class: klass.id, sections, chosen })
  ok('the teacher saves the plan', !saveError, saveError?.message ?? '')

  const { error: otherError } = await asOther.rpc('save_class_plan', { plan_class: klass.id, sections: [], chosen: [] })
  ok('another teacher cannot overwrite it', Boolean(otherError), otherError?.message ?? 'it went through')
  const { error: studentError } = await asStudent.rpc('save_class_plan', { plan_class: klass.id, sections: [], chosen: [] })
  ok('a student cannot overwrite it', Boolean(studentError), studentError?.message ?? 'it went through')

  section('who reads it')
  const { data: studentRows } = await asStudent
    .from('class_tracks')
    .select('topic_id, position, target, skipped, due_date, note')
    .eq('class_id', klass.id)
  const { data: studentPicks } = await asStudent
    .from('class_track_tasks')
    .select('topic_id, task_id, position')
    .eq('class_id', klass.id)
    .order('position')
  ok('the student reads every section row', studentRows?.length === topics.length, `${studentRows?.length}`)
  ok('the student reads the chosen problems', studentPicks?.length === 3)
  const { data: otherRows } = await asOther.from('class_tracks').select('topic_id').eq('class_id', klass.id)
  const { data: otherPicks } = await asOther.from('class_track_tasks').select('task_id').eq('class_id', klass.id)
  ok('an outsider reads no section', (otherRows ?? []).length === 0)
  ok('an outsider reads no chosen problem', (otherPicks ?? []).length === 0)

  section('the route the student is on')
  const nameOf = new Map(topics.map((topic) => [topic.id, topic.name]))
  const track = new Map()
  for (const row of studentRows) {
    track.set(nameOf.get(row.topic_id), {
      position: row.position,
      target: row.target,
      skipped: row.skipped,
      due: row.due_date,
      note: row.note,
      picks: studentPicks.filter((p) => p.topic_id === row.topic_id).map((p) => p.task_id),
    })
  }
  const { data: all } = await admin
    .from('tasks')
    .select('id, title, topic_id, difficulty, estimated_minutes')
    .in('topic_id', topics.map((topic) => topic.id))
    .range(0, 4999)
  const catalogue = all.map((task) => ({
    id: task.id,
    title: task.title,
    subject: 'Mathematics',
    topic: nameOf.get(task.topic_id),
    topicPosition: 0,
    level: null,
    paper: null,
    difficulty: task.difficulty,
    estimatedMinutes: task.estimated_minutes,
    source: null,
    solved: false,
    attempts: 0,
  }))
  const path = buildPath(catalogue, 'Mathematics', track)
  const stageA = path.stages.find((stage) => stage.topic === algebra.name)
  ok('geometry is out of the route', !path.stages.some((stage) => stage.topic === geometry.name))
  ok('…and named as left out', path.skipped.includes(geometry.name))
  ok('algebra asks for the three chosen problems', stageA?.target === 3, `target ${stageA?.target}`)
  ok(
    'in the teacher’s order, not easiest first',
    JSON.stringify(stageA?.todo.map((task) => task.id)) === JSON.stringify(picks),
  )
  ok('the deadline reaches the route', stageA?.due === '2026-12-20')
  ok('the note reaches the route', stageA?.note?.startsWith('Глава 3'))
  const untouched = path.stages.find((stage) => stage.topic !== algebra.name)
  ok(
    'an untouched section keeps the default quota',
    untouched?.target === Math.min(DEFAULT_TARGET, untouched?.total ?? 0) && !untouched?.chosen,
  )

  section('saving again replaces the whole plan')
  const { error: resaveError } = await asTeacher.rpc('save_class_plan', {
    plan_class: klass.id,
    sections: [],
    chosen: [],
  })
  ok('back to the syllabus', !resaveError, resaveError?.message ?? '')
  const { data: after } = await admin.from('class_tracks').select('topic_id').eq('class_id', klass.id)
  const { data: afterPicks } = await admin.from('class_track_tasks').select('task_id').eq('class_id', klass.id)
  ok('no section rows left', (after ?? []).length === 0)
  ok('no chosen problems left', (afterPicks ?? []).length === 0)
} catch (cause) {
  console.error('\n', cause)
  failures += 1
} finally {
  if (!KEEP) {
    for (const id of made) await admin.auth.admin.deleteUser(id)
    console.log(`\ncleaned up ${made.length} test account(s)`)
  } else {
    console.log(`\nkept ${made.length} account(s): ${made.join(' ')}`)
  }
}

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
