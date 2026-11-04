import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { FILE_TYPES, MAX_FILE_BYTES, removeClassFile, saveClassFile, storedPathFor } from '@/lib/class-files'
import { getT } from '@/lib/i18n/server'

export const runtime = 'nodejs'

/**
 * A teacher hands a file to their class.
 *
 * A route rather than a server action: a 20 MB scan is far past the size a
 * server action accepts, and the original's signed upload URL needed an object
 * store this deployment does not have. The class is read as the teacher, so a
 * class that is not theirs is not found; the row is then written as them too,
 * and its policy checks the same thing again.
 */
export async function POST(request: Request) {
  const t = await getT()
  const fail = (message: string, status = 400) => NextResponse.json({ error: t(message) }, { status })

  const user = await getVerifiedUser()
  if (!user) return fail('Your session has expired. Please log in again.', 401)

  const form = await request.formData().catch(() => null)
  const classId = String(form?.get('class_id') ?? '')
  const file = form?.get('file')
  if (!classId || !(file instanceof File)) return fail('Which file?')

  const supabase = await createClient()
  const { data: klass } = await supabase
    .from('classes')
    .select('id')
    .eq('id', classId)
    .eq('teacher_id', user.id)
    .maybeSingle()
  if (!klass) return fail('That is not one of your classes.', 403)

  if (!FILE_TYPES.has(file.type)) return fail('Upload a PDF, an image, a Word or PowerPoint file, or plain text.')
  if (!(file.size > 0 && file.size <= MAX_FILE_BYTES)) return fail('Files can be up to 20 MB.')

  const stored = storedPathFor(classId, file.name)
  await saveClassFile(stored, new Uint8Array(await file.arrayBuffer()))

  const { error } = await supabase.from('class_files').insert({
    class_id: classId,
    path: stored,
    name: file.name.trim().slice(0, 200) || 'file',
    size: file.size,
    mime: file.type,
    uploaded_by: user.id,
  })
  if (error) {
    await removeClassFile(stored)
    return fail('The file could not be added to the class.', 500)
  }

  revalidatePath(`/class/${classId}`)
  revalidatePath('/class')
  return NextResponse.json({ ok: true })
}
