import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { ActionButton } from '@/components/admin/action-button'
import { generateCardsBatch } from '@/app/(app)/admin/opora/actions'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { getDb } from '@/lib/db'
import { usageSummary } from '@/lib/opora/usage'
import { LEVEL_LABEL, type Level } from '@/lib/opora/ladder'
import { ago } from '@/lib/admin/format'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Opora · Admin') }
}

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}k`
  return String(value)
}

export default async function AdminOporaPage() {
  await requireAdminPage()
  const [t, locale, db] = await Promise.all([getT(), getLocale(), getDb()])

  const [usage, { rows: coverage }, { rows: wanted }, { rows: cards }, { rows: recent }] = await Promise.all([
    usageSummary(30),
    db.query<{ verified: number; drafts: number; tasks: number }>(`
      select (select count(*) from public.task_cards where status = 'verified')::int as verified,
             (select count(*) from public.task_cards where status = 'draft')::int as drafts,
             (select count(*) from public.tasks where class_id is null and not hidden)::int as tasks`),
    db.query<{ id: string; title: string; chats: number }>(`
      select tk.id, tk.title, count(s.id)::int as chats
        from public.chat_sessions s join public.tasks tk on tk.id = s.task_id
        left join public.task_cards c on c.task_id = tk.id
       where c.task_id is null or c.status = 'draft'
       group by tk.id, tk.title order by chats desc limit 12`),
    db.query<{ task_id: string; title: string; status: string; updated_at: string }>(`
      select c.task_id, tk.title, c.status, c.updated_at from public.task_cards c join public.tasks tk on tk.id = c.task_id
       order by c.updated_at desc limit 20`),
    db.query<{ id: string; content: string; meta: { level?: number; source?: string; guarded?: boolean } | null; created_at: string; task_id: string | null; title: string | null }>(`
      select m.id, m.content, m.meta, m.created_at, s.task_id, tk.title
        from public.chat_messages m join public.chat_sessions s on s.id = m.session_id
        left join public.tasks tk on tk.id = s.task_id
       where m.role = 'assistant' and m.meta ? 'level'
       order by m.created_at desc limit 30`),
  ])
  const cover = coverage[0] ?? { verified: 0, drafts: 0, tasks: 0 }
  const freeShare = usage.answers ? Math.round((usage.fromCards / usage.answers) * 100) : 0

  const stats = [
    { label: t('Tutor answers, 30d'), value: usage.answers, note: t('{n} from verified cards ({p}%)', { n: usage.fromCards, p: freeShare }) },
    { label: t('Model calls, 30d'), value: usage.fromModel, note: t('{n} card drafts', { n: usage.cardDrafts }) },
    {
      label: t('Tokens, 30d'),
      value: compact(usage.inputTokens + usage.outputTokens),
      note: t('{i} in ({c} cached) · {o} out', { i: compact(usage.inputTokens), c: compact(usage.cachedTokens), o: compact(usage.outputTokens) }),
    },
    { label: t('Replies corrected'), value: usage.guarded, note: t('Gave the answer away or broke a formula'), alert: usage.guarded > 0 },
    { label: t('Verified cards'), value: cover.verified, note: t('{n} drafts · {m} problems in all', { n: cover.drafts, m: cover.tasks }) },
  ]

  return (
    <>
      <PageHeader
        title={t('Opora')}
        description={t('Verified problem cards and a hint ladder. A ready hint from a verified card costs nothing; the model is called once per turn only to read an attempt or answer a question.')}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className={cn(cardClass, 'p-5')}>
            <p className="eyebrow">{stat.label}</p>
            <p className={cn('mt-3 text-[28px] leading-none tabular-nums', stat.alert ? 'text-coral' : 'text-foreground')}>{stat.value}</p>
            <p className="mt-2 text-xs text-ash">{stat.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={cn(cardClass, 'p-5')}>
          <h2 className="text-[15px] font-medium text-foreground">{t('Hints by level, 30d')}</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-[11px] text-smoke">
              <tr>
                <th className="py-1 font-normal">{t('Level')}</th>
                <th className="py-1 text-right font-normal">{t('From cards')}</th>
                <th className="py-1 text-right font-normal">{t('From the model')}</th>
              </tr>
            </thead>
            <tbody>
              {([1, 2, 3, 4, 5] as Level[]).map((level) => {
                const row = usage.byLevel.find((item) => item.level === level)
                return (
                  <tr key={level} className="border-t border-foreground/[0.06]">
                    <td className="py-1.5 text-ash">
                      {level} · {t(LEVEL_LABEL[level])}
                    </td>
                    <td className="py-1.5 text-right font-mono text-foreground">{row?.card ?? 0}</td>
                    <td className="py-1.5 text-right font-mono text-foreground">{row?.model ?? 0}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <section className={cn(cardClass, 'space-y-3 p-5')}>
          <h2 className="text-[15px] font-medium text-foreground">{t('Problems that need a card')}</h2>
          <p className="text-xs leading-5 text-ash">
            {t('Most-asked first. The model drafts a card from the reference solution; an admin checks it and marks it verified.')}
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionButton action={generateCardsBatch.bind(null, 5)} confirm={t('Draft cards for 5 problems? This calls the model 5 times.')}>
              <Sparkles className="size-3.5" /> {t('Draft 5 cards')}
            </ActionButton>
            <ActionButton action={generateCardsBatch.bind(null, 10)} confirm={t('Draft cards for 10 problems? This calls the model 10 times.')}>
              <Sparkles className="size-3.5" /> {t('Draft 10 cards')}
            </ActionButton>
          </div>
          {wanted.length ? (
            <ul className="space-y-1.5 text-sm">
              {wanted.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <Link href={`/admin/tasks/${row.id}#card`} className="min-w-0 truncate text-ash hover:text-foreground">
                    {row.title}
                  </Link>
                  <span className="shrink-0 font-mono text-[12px] text-smoke">{t('{n} chats', { n: row.chats })}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ash">{t('Every problem students ask about has a verified card.')}</p>
          )}
        </section>
      </div>

      <section className={cn(cardClass, 'p-5')}>
        <h2 className="text-[15px] font-medium text-foreground">{t('Latest tutor answers')}</h2>
        <p className="mt-1 text-xs text-ash">{t('Read real answers to check the cards and the rules. Corrected ones are marked.')}</p>
        {recent.length ? (
          <ul className="mt-3 divide-y divide-foreground/[0.06]">
            {recent.map((row) => (
              <li key={row.id} className="py-3">
                <p className="flex flex-wrap gap-x-2 font-mono text-[11px] text-smoke">
                  <span>{ago(row.created_at, t, locale)}</span>
                  <span>· {t(LEVEL_LABEL[(row.meta?.level ?? 1) as Level])}</span>
                  <span>· {row.meta?.source === 'card' ? t('card') : t('model')}</span>
                  {row.meta?.guarded ? <span className="text-coral">· {t('corrected')}</span> : null}
                  {row.task_id ? (
                    <Link href={`/admin/tasks/${row.task_id}#card`} className="truncate text-ash hover:text-foreground">
                      · {row.title}
                    </Link>
                  ) : null}
                </p>
                <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-ash">{row.content}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ash">{t('No answers yet.')}</p>
        )}
      </section>

      <section className={cn(cardClass, 'p-5')}>
        <h2 className="text-[15px] font-medium text-foreground">{t('Recently edited cards')}</h2>
        {cards.length ? (
          <ul className="mt-3 space-y-1.5 text-sm">
            {cards.map((row) => (
              <li key={row.task_id} className="flex justify-between gap-3">
                <Link href={`/admin/tasks/${row.task_id}#card`} className="min-w-0 truncate text-ash hover:text-foreground">
                  {row.title}
                </Link>
                <span className={cn('shrink-0 text-[12px]', row.status === 'verified' ? 'text-success' : 'text-smoke')}>
                  {row.status === 'verified' ? t('verified') : t('draft')} · {ago(row.updated_at, t, locale)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ash">{t('No cards yet.')}</p>
        )}
      </section>
    </>
  )
}
