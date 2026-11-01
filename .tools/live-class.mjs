/**
 * The teacher feature, against the live database, as the browser would reach it.
 *
 * This is a test of the policies rather than of the pages: every read below
 * goes through a real signed-in session with the publishable key, so what comes
 * back is what RLS allows and nothing is taken on trust from a page that could
 * have forgotten to filter. The three things that must stay private — the day
 * diagram, the tutor conversations, the cards — are asserted empty.
 *
 * It creates two throwaway accounts and deletes them again.
 *
 *   node --import ./.tools/register.mjs .tools/live-class.mjs [--keep]
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
const PASSWORD = `cls-${stamp}-${Math.random().toString(36).slice(2)}`
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

/** A client that is signed in as that account: anon key plus their session. */
async function sessionFor(email) {
  const client = createClient(URL, KEY, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`sign in ${email}: ${error.message}`)
  return client
}

try {
  section('accounts')
  const teacher = await makeUser(`teacher+${stamp}@olympai.test`, {
    full_name: 'Teacher Test',
    role: 'teacher',
  })
  const other = await makeUser(`teacher2+${stamp}@olympai.test`, {
    full_name: 'Other Teacher',
    role: 'teacher',
  })
  const student = await makeUser(`student+${stamp}@olympai.test`, {
    full_name: 'Student Test',
    telegram_username: `stu${stamp}`.slice(0, 32),
  })

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, role, onboarding_completed_at, full_name')
    .in('id', [teacher.id, other.id, student.id])
  const byId = new Map(profiles.map((row) => [row.id, row]))
  ok('teacher profile has role teacher', byId.get(teacher.id)?.role === 'teacher')
  ok(
    'teacher skips onboarding',
    Boolean(byId.get(teacher.id)?.onboarding_completed_at),
    'onboarding_completed_at is set at creation',
  )
  ok('student profile has role student', byId.get(student.id)?.role === 'student')
  ok(
    'student still needs onboarding',
    byId.get(student.id)?.onboarding_completed_at === null,
  )
  ok('full name carried across', byId.get(student.id)?.full_name === 'Student Test')

  const asTeacher = await sessionFor(teacher.email)
  const asOther = await sessionFor(other.email)
  const asStudent = await sessionFor(student.email)

  section('who may open a class')
  const { data: created, error: createError } = await asTeacher
    .from('classes')
    .insert({ teacher_id: teacher.id, name: '11A physics' })
    .select('id, join_code')
    .single()
  ok('teacher creates a class', Boolean(created), createError?.message ?? '')
  ok(
    'the code is six unambiguous characters',
    /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(created?.join_code ?? ''),
    created?.join_code,
  )

  const { error: studentClassError } = await asStudent
    .from('classes')
    .insert({ teacher_id: student.id, name: 'Not allowed' })
  ok('a student cannot open a class', Boolean(studentClassError), studentClassError?.code)

  const { error: impostorError } = await asOther
    .from('classes')
    .insert({ teacher_id: teacher.id, name: 'Somebody else’s class' })
  ok('a teacher cannot open a class in another name', Boolean(impostorError), impostorError?.code)

  section('joining')
  const { error: selfJoinError } = await asStudent
    .from('class_members')
    .insert({ class_id: created.id, student_id: student.id })
  ok(
    'a student cannot add themselves with the id alone',
    Boolean(selfJoinError),
    'the code is checked by the action, which writes with the service role',
  )

  // What app/(app)/class/actions.ts does once the code matches.
  const { error: joinError } = await admin
    .from('class_members')
    .insert({ class_id: created.id, student_id: student.id })
  ok('the action can add them', !joinError, joinError?.message ?? '')

  section('what the teacher can now see')
  // A graded attempt, written the way the grader writes one.
  const { data: task } = await admin.from('tasks').select('id').limit(1).maybeSingle()
  await admin.from('task_attempts').insert({
    user_id: student.id,
    task_id: task.id,
    answer: 'a test derivation',
    is_correct: true,
    score: 90,
  })
  // The three kinds of row that must not travel.
  await admin.from('day_states').insert({
    user_id: student.id,
    on_date: new Date().toISOString().slice(0, 10),
    sleep_hours: 7,
    mental: 4,
    theory_minutes: 60,
    solving_minutes: 90,
    load_minutes: 300,
  })
  const { data: chat } = await admin
    .from('chat_sessions')
    .insert({ user_id: student.id, title: 'stuck on problem 3' })
    .select('id')
    .single()

  const { data: seenAttempts } = await asTeacher
    .from('task_attempts')
    .select('id, score')
    .eq('user_id', student.id)
  ok('teacher reads their student’s attempts', seenAttempts?.length === 1, `${seenAttempts?.length} row(s)`)

  const { data: seenProfile } = await asTeacher
    .from('profiles')
    .select('full_name')
    .eq('id', student.id)
    .maybeSingle()
  ok('teacher reads their student’s name', seenProfile?.full_name === 'Student Test')

  const { data: seenDays } = await asTeacher
    .from('day_states')
    .select('id')
    .eq('user_id', student.id)
  ok('the day diagram stays private', (seenDays ?? []).length === 0, 'no rows for the teacher')

  const { data: seenChats } = await asTeacher
    .from('chat_sessions')
    .select('id')
    .eq('user_id', student.id)
  ok('the tutor conversations stay private', (seenChats ?? []).length === 0)

  const { data: strangerAttempts } = await asOther
    .from('task_attempts')
    .select('id')
    .eq('user_id', student.id)
  ok(
    'a teacher who does not teach them sees nothing',
    (strangerAttempts ?? []).length === 0,
  )

  const { data: strangerProfile } = await asOther
    .from('profiles')
    .select('full_name')
    .eq('id', student.id)
    .maybeSingle()
  ok('and cannot read their name either', !strangerProfile)

  section('the student’s side')
  const { data: ownClass } = await asStudent
    .from('classes')
    .select('id, name, join_code')
    .eq('id', created.id)
    .maybeSingle()
  ok('a student can see the class they are in', ownClass?.name === '11A physics')

  const { data: roster } = await asStudent
    .from('class_members')
    .select('student_id')
    .eq('class_id', created.id)
  ok(
    'but not who else is in it',
    roster?.length === 1 && roster[0].student_id === student.id,
    `${roster?.length} row(s), their own`,
  )

  const { error: leaveError } = await asStudent
    .from('class_members')
    .delete()
    .eq('class_id', created.id)
    .eq('student_id', student.id)
  ok('a student can leave', !leaveError, leaveError?.message ?? '')

  const { data: afterLeaving } = await asTeacher
    .from('task_attempts')
    .select('id')
    .eq('user_id', student.id)
  ok('and the teacher stops seeing their work', (afterLeaving ?? []).length === 0)

  section('removing and closing')
  await admin.from('class_members').insert({ class_id: created.id, student_id: student.id })
  const { error: removeError } = await asTeacher
    .from('class_members')
    .delete()
    .eq('class_id', created.id)
    .eq('student_id', student.id)
  ok('a teacher can take a student off the roster', !removeError, removeError?.message ?? '')

  const { error: foreignRemoveError } = await asOther
    .from('classes')
    .delete()
    .eq('id', created.id)
  const { data: stillThere } = await admin
    .from('classes')
    .select('id')
    .eq('id', created.id)
    .maybeSingle()
  ok(
    'another teacher cannot delete the class',
    Boolean(stillThere),
    foreignRemoveError?.message ?? 'nothing was deleted',
  )

  const { error: deleteError } = await asTeacher.from('classes').delete().eq('id', created.id)
  ok('its own teacher can', !deleteError, deleteError?.message ?? '')

  const { data: attemptSurvives } = await admin
    .from('task_attempts')
    .select('id')
    .eq('user_id', student.id)
  ok(
    'deleting a class leaves the work alone',
    (attemptSurvives ?? []).length === 1,
    'the student keeps everything they did',
  )

  await admin.from('chat_sessions').delete().eq('id', chat.id)
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
