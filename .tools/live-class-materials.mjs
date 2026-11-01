/**
 * A class's own problems and files, against the live database, through real
 * signed-in sessions (migration 55).
 *
 * What must hold: the class's problem is graded like any task, so it sits in
 * `tasks` — and yet only the teacher and the students of that class can read
 * it, and the shared catalogue never lists it. A file is a row the class can
 * read and an object nobody but the service role can touch.
 *
 * Creates three throwaway accounts, a class, a problem and a file, and deletes
 * them all again.
 *
 *   node --import ./.tools/register.mjs .tools/live-class-materials.mjs [--keep]
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

const stamp = Date.now()
const PASSWORD = `mat-${stamp}-${Math.random().toString(36).slice(2)}`
const made = []
let classId = null
const taskId = `class-live${stamp}`.slice(0, 22)
const path = () => `${classId}/live-${stamp}.txt`

async function makeUser(email, metadata) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: metadata })
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
  const teacher = await makeUser(`mteacher+${stamp}@olympai.test`, { full_name: 'Material Teacher', role: 'teacher' })
  const student = await makeUser(`mstudent+${stamp}@olympai.test`, { full_name: 'Material Student' })
  await makeUser(`moutsider+${stamp}@olympai.test`, { full_name: 'Outsider' })
  const [asTeacher, asStudent, asOutsider] = await Promise.all([
    sessionFor(`mteacher+${stamp}@olympai.test`),
    sessionFor(`mstudent+${stamp}@olympai.test`),
    sessionFor(`moutsider+${stamp}@olympai.test`),
  ])

  const { data: subject } = await admin.from('subjects').select('id').eq('slug', 'mathematics').single()
  const { data: topic } = await admin.from('topics').select('id').eq('subject_id', subject.id).limit(1).single()
  const { data: klass, error: classError } = await asTeacher.from('classes').insert({ teacher_id: teacher.id, name: `Live ${stamp}`, subject_id: subject.id }).select('id').single()
  if (classError) throw classError
  classId = klass.id
  const { error: joinError } = await admin.from('class_members').insert({ class_id: classId, student_id: student.id })
  if (joinError) throw joinError

  // As createClassTask writes it.
  const { error: taskError } = await admin.from('tasks').insert({
    id: taskId, class_id: classId, created_by: teacher.id, subject_id: subject.id, topic_id: topic.id,
    title: 'Live class problem', problem: 'Prove that 1 + 1 = 2 in a sentence.', official_solution: 'Because.',
    difficulty: 2, licence: 'original', attribution: 'Задача учителя',
  })
  ok('problem written with the service role', !taskError, taskError?.message)

  const read = async (client) => (await client.from('tasks').select('id, problem').eq('id', taskId).maybeSingle()).data
  ok('teacher reads the problem', Boolean(await read(asTeacher)))
  ok('student in the class reads it', Boolean(await read(asStudent)))
  ok('student outside the class does not', !(await read(asOutsider)))
  const { data: key } = await asStudent.from('tasks').select('official_solution').eq('id', taskId).maybeSingle()
  ok('the reference solution stays out of reach', !key)

  const { data: catalogue } = await admin.from('tasks').select('id').is('class_id', null).eq('id', taskId)
  ok('the shared catalogue query leaves it out', catalogue?.length === 0)

  // A file, the way the panel uploads it: a signed URL, a PUT, then the row.
  const { data: signed, error: signError } = await admin.storage.from('class-files').createSignedUploadUrl(path())
  ok('signed upload URL', Boolean(signed?.signedUrl), signError?.message)
  const put = await fetch(signed.signedUrl, { method: 'PUT', body: 'live check', headers: { 'content-type': 'text/plain' } })
  ok('bytes accepted', put.ok, String(put.status))
  const { error: rowError } = await asTeacher.from('class_files').insert({ class_id: classId, path: path(), name: 'live.txt', size: 10, mime: 'text/plain', uploaded_by: teacher.id })
  ok('teacher records the file', !rowError, rowError?.message)
  const { error: studentInsert } = await asStudent.from('class_files').insert({ class_id: classId, path: `${classId}/x.txt`, name: 'x', size: 1, mime: 'text/plain', uploaded_by: student.id })
  ok('a student cannot add a file', Boolean(studentInsert))

  const rows = async (client) => (await client.from('class_files').select('id').eq('class_id', classId)).data ?? []
  ok('student sees the file', (await rows(asStudent)).length === 1)
  ok('outsider does not', (await rows(asOutsider)).length === 0)

  const { data: direct } = await asStudent.storage.from('class-files').download(path())
  ok('the object is not readable with a user session', !direct)
  const { data: link } = await admin.storage.from('class-files').createSignedUrl(path(), 60)
  const got = await fetch(link.signedUrl)
  ok('a signed link downloads it', got.ok && (await got.text()) === 'live check')

  const { data: comps } = await asStudent.from('competitions').select('slug, name, active').in('slug', ['apmo', 'igo', 'euler', 'silk-road'])
  ok('the four olympiads are in the catalogue', comps?.filter((c) => c.active).length === 4, comps?.map((c) => c.name).join('; '))
} finally {
  if (!KEEP) {
    if (classId) {
      await admin.storage.from('class-files').remove([path()])
      await admin.from('tasks').delete().eq('id', taskId)
      await admin.from('classes').delete().eq('id', classId)
    }
    for (const id of made) await admin.auth.admin.deleteUser(id)
  }
}

console.log(failures ? `\n${failures} failed` : '\nall passed')
process.exit(failures ? 1 : 0)
