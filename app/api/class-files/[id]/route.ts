import { getVerifiedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { classFileExists, readClassFile } from '@/lib/class-files'

export const runtime = 'nodejs'

/**
 * Downloads one of a class's files.
 *
 * Reading the row as the user is the whole check: the policy lets the class's
 * teacher and its students see it, and anyone else gets nothing — so anyone
 * else gets a 404, not a hint that the file exists.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getVerifiedUser()
  if (!user || !/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 })

  const supabase = await createClient()
  const { data: file } = await supabase.from('class_files').select('path, name, mime').eq('id', id).maybeSingle()
  if (!file || !(await classFileExists(file.path))) return new Response('Not found', { status: 404 })

  const bytes = await readClassFile(file.path)
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': file.mime,
      'Content-Length': String(bytes.length),
      // Always a download: a teacher's PDF or HTML-looking text should never
      // render as a page on this origin.
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  })
}
