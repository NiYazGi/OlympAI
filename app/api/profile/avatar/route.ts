import { getSessionUserId } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) return new Response(null, { status: 404 })

  const supabase = await createClient()
  const { data } = await supabase.from('profile_avatars').select('webp_base64').eq('user_id', userId).maybeSingle()
  if (!data) return new Response(null, { status: 404 })

  return new Response(new Uint8Array(Buffer.from(data.webp_base64, 'base64')), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
