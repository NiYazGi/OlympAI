import 'server-only'

import { getDb } from '@/lib/db'
import type { SuluUsage } from '@/lib/sulu/provider'

/** One line in the ledger. Never throws: an answer already given is not undone by its bookkeeping. */
export async function recordUsage(entry: {
  userId: string | null
  taskId: string | null
  kind: 'hint' | 'chat' | 'card'
  source: 'model' | 'card'
  level?: number | null
  model?: string | null
  usage?: SuluUsage | null
  guarded?: boolean
}) {
  try {
    const db = await getDb()
    await db.query(
      `insert into public.ai_usage (user_id, task_id, kind, source, level, model, input_tokens, cached_tokens, output_tokens, guarded)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        entry.userId,
        entry.taskId,
        entry.kind,
        entry.source,
        entry.level ?? null,
        entry.model ?? null,
        entry.usage?.input ?? 0,
        entry.usage?.cached ?? 0,
        entry.usage?.output ?? 0,
        entry.guarded ?? false,
      ],
    )
  } catch (cause) {
    console.error('[ai-usage]', cause)
  }
}

export type UsageSummary = {
  answers: number
  fromCards: number
  fromModel: number
  guarded: number
  inputTokens: number
  cachedTokens: number
  outputTokens: number
  cardDrafts: number
  byLevel: { level: number; model: number; card: number }[]
  byDay: { day: string; model: number; card: number }[]
}

export async function usageSummary(days = 30): Promise<UsageSummary> {
  const db = await getDb()
  const since = `now() - interval '${Math.max(1, Math.min(365, Math.round(days)))} days'`
  const [{ rows: totals }, { rows: levels }, { rows: daily }] = await Promise.all([
    db.query<Record<string, number>>(`
      select
        count(*) filter (where kind <> 'card')::int as answers,
        count(*) filter (where kind <> 'card' and source = 'card')::int as from_cards,
        count(*) filter (where kind <> 'card' and source = 'model')::int as from_model,
        count(*) filter (where guarded)::int as guarded,
        coalesce(sum(input_tokens), 0)::int as input_tokens,
        coalesce(sum(cached_tokens), 0)::int as cached_tokens,
        coalesce(sum(output_tokens), 0)::int as output_tokens,
        count(*) filter (where kind = 'card')::int as card_drafts
      from public.ai_usage where created_at > ${since}`),
    db.query<{ level: number; model: number; card: number }>(`
      select level, count(*) filter (where source = 'model')::int as model, count(*) filter (where source = 'card')::int as card
        from public.ai_usage where kind = 'hint' and level is not null and created_at > ${since}
       group by level order by level`),
    db.query<{ day: string; model: number; card: number }>(`
      select to_char(created_at::date, 'YYYY-MM-DD') as day,
             count(*) filter (where source = 'model')::int as model, count(*) filter (where source = 'card')::int as card
        from public.ai_usage where kind <> 'card' and created_at > ${since}
       group by 1 order by 1`),
  ])
  const total = totals[0] ?? {}
  return {
    answers: total.answers ?? 0,
    fromCards: total.from_cards ?? 0,
    fromModel: total.from_model ?? 0,
    guarded: total.guarded ?? 0,
    inputTokens: total.input_tokens ?? 0,
    cachedTokens: total.cached_tokens ?? 0,
    outputTokens: total.output_tokens ?? 0,
    cardDrafts: total.card_drafts ?? 0,
    byLevel: levels,
    byDay: daily,
  }
}
