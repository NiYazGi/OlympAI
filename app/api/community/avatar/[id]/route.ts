import { getSessionUserId } from '@/lib/supabase/auth'
import { avatarFor, communityEnabled } from '@/lib/community'

/** Another member's picture, for the forum and profiles: signed-in viewers only. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!communityEnabled() || !/^[0-9a-f-]{36}$/i.test(id) || !(await getSessionUserId())) return new Response(null, { status: 404 })
  const avatar = await avatarFor(id)
  if (!avatar) return new Response(null, { status: 404 })
  return new Response(new Uint8Array(Buffer.from(avatar.webp_base64, 'base64')), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
