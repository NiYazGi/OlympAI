/**
 * A teacher, a class and three students with different amounts of work done,
 * so the roster can be looked at rather than imagined. Writes a one-time
 * sign-in link for the teacher to a local file, the way .tools/magic-link.mjs
 * does, so no password passes through a transcript.
 *
 *   node --import ./.tools/register.mjs .tools/class-demo.mjs <link-file>
 *   node --import ./.tools/register.mjs .tools/class-demo.mjs --remove
 */
import { readFile, writeFile } from 'node:fs/promises'

const ROOT = '/Users/niya/Desktop/olympAI'
const raw = await readFile(`${ROOT}/.env.local`, 'utf8')
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
}

const { createAdminClient } = await import('@/lib/supabase/admin')
const admin = createAdminClient()

const TEACHER = 'coach.demo@olympai.test'
/*
 * One password for the demo accounts, generated here and written next to the
 * sign-in link rather than printed. These accounts exist to be clicked through
 * on localhost; nothing real is behind them, and --remove deletes them.
 */
const DEMO_PASSWORD = `demo-${Math.random().toString(36).slice(2)}-${Date.now()}`
const STUDENTS = [
  { email: 'aisha.demo@olympai.test', name: 'Aisha Demo', solve: 14, wrong: 3 },
  { email: 'daniyar.demo@olympai.test', name: 'Daniyar Demo', solve: 5, wrong: 6 },
  { email: 'mira.demo@olympai.test', name: 'Mira Demo', solve: 0, wrong: 0 },
]
const ALL = [TEACHER, ...STUDENTS.map((s) => s.email)]

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
const existing = new Map((list?.users ?? []).map((user) => [user.email, user]))

if (process.argv.includes('--remove')) {
  for (const email of ALL) {
    const user = existing.get(email)
    if (user) await admin.auth.admin.deleteUser(user.id)
  }
  console.log('demo accounts removed')
  process.exit(0)
}

const out = process.argv[2]
if (!out) {
  console.error('Pass a path to write the sign-in link to.')
  process.exit(1)
}

async function ensure(email, metadata) {
  const found = existing.get(email)
  if (found) {
    await admin.auth.admin.updateUserById(found.id, { password: DEMO_PASSWORD })
    return found
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  })
  if (error) throw new Error(`${email}: ${error.message}`)
  return data.user
}

const teacher = await ensure(TEACHER, { full_name: 'Marat Coach', role: 'teacher' })

// A class in mathematics, so the readiness column has a subject to measure.
const { data: subject } = await admin
  .from('subjects')
  .select('id')
  .eq('slug', 'mathematics')
  .single()

let { data: klass } = await admin
  .from('classes')
  .select('id, join_code')
  .eq('teacher_id', teacher.id)
  .maybeSingle()
if (!klass) {
  const { data, error } = await admin
    .from('classes')
    .insert({ teacher_id: teacher.id, name: '11A mathematics', subject_id: subject.id })
    .select('id, join_code')
    .single()
  if (error) throw new Error(error.message)
  klass = data
}

const { data: tasks } = await admin
  .from('tasks')
  .select('id')
  .eq('subject_id', subject.id)
  .order('difficulty')
  .limit(40)

for (const spec of STUDENTS) {
  const user = await ensure(spec.email, { full_name: spec.name })
  await admin
    .from('profiles')
    .update({
      full_name: spec.name,
      onboarding_completed_at: new Date().toISOString(),
      grade: 'Grade 11–12',
      primary_subject: 'Mathematics',
      target_subject_id: subject.id,
      target_date: new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10),
    })
    .eq('id', user.id)
  await admin
    .from('class_members')
    .upsert({ class_id: klass.id, student_id: user.id }, { onConflict: 'class_id,student_id' })

  const { count } = await admin
    .from('task_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if (count) continue

  const rows = []
  let index = 0
  for (let i = 0; i < spec.solve; i += 1, index += 1) {
    rows.push({
      user_id: user.id,
      task_id: tasks[index % tasks.length].id,
      answer: 'demo derivation',
      is_correct: true,
      score: 85 + (i % 3) * 5,
      created_at: new Date(Date.now() - (i + 1) * 12 * 3_600_000).toISOString(),
    })
  }
  for (let i = 0; i < spec.wrong; i += 1, index += 1) {
    rows.push({
      user_id: user.id,
      task_id: tasks[index % tasks.length].id,
      answer: 'demo attempt that did not land',
      is_correct: false,
      score: 20 + (i % 4) * 10,
      created_at: new Date(Date.now() - (i + 2) * 30 * 3_600_000).toISOString(),
    })
  }
  if (rows.length) {
    const { error } = await admin.from('task_attempts').insert(rows)
    if (error) throw new Error(`${spec.email}: ${error.message}`)
  }
}

const { data: link, error: linkError } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: TEACHER,
  options: { redirectTo: 'http://localhost:3001/auth/callback?next=/class' },
})
if (linkError) throw new Error(linkError.message)

await writeFile(
  out,
  [
    link.properties.action_link,
    '',
    `teacher: ${TEACHER}`,
    ...STUDENTS.map((student) => `student: ${student.email}`),
    `password: ${DEMO_PASSWORD}`,
    '',
  ].join('\n'),
  { mode: 0o600 },
)
console.log(`class ${klass.id}  code ${klass.join_code}`)
console.log(`sign-in link and demo passwords written to ${out}`)
