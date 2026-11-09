import 'server-only'

import { cache } from 'react'
import { getSessionUserId } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'

export const getAvatarSrc = cache(async () => {
  const userId = await getSessionUserId()
  if (!userId) return undefined

  const supabase = await createClient()
  const { data } = await supabase.from('profile_avatars').select('updated_at').eq('user_id', userId).maybeSingle()
  return data ? `/api/profile/avatar?v=${encodeURIComponent(data.updated_at)}` : undefined
})
