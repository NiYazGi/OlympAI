import 'server-only'

import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/supabase/auth'

export const RANKING_LIMIT = 50

type RankingRow = {
  place: number
  position: number
  username: string | null
  points: number
  isCurrentUser: boolean
}

export async function getGlobalRanking(): Promise<RankingRow[]> {
  const userId = await getSessionUserId()
  if (!userId) return []

  const db = await getDb()
  // Only the best grade on each shared problem contributes. Squaring the
  // score rewards complete solutions while keeping improvements monotonic.
  const { rows } = await db.query<RankingRow>(`
    with best as (
      select a.user_id, a.task_id, t.difficulty, max(a.score)::numeric as score
      from public.task_attempts a
      join public.tasks t on t.id = a.task_id
      join public.profiles p on p.id = a.user_id
      join auth.users u on u.id = a.user_id
      where a.score > 0 and t.class_id is null and not t.hidden
        and p.role = 'student' and u.banned_at is null
      group by a.user_id, a.task_id, t.difficulty
    ), scores as (
      select user_id, round(sum(difficulty * score * score / 100), 2) as points
      from best
      group by user_id
    ), standings as (
      select user_id, points, rank() over (order by points desc)::int as place,
        row_number() over (order by points desc, user_id)::int as position
      from scores
      where points > 0
    )
    select s.place, s.position, nullif(trim(p.username), '') as username, s.points,
      s.user_id = $1 as "isCurrentUser"
    from standings s
    join public.profiles p on p.id = s.user_id
    where s.position <= $2 or s.user_id = $1
    order by s.position
  `, [userId, RANKING_LIMIT])

  return rows
}
