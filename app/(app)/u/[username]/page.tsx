import { notFound, redirect } from 'next/navigation'
import { Award as AwardIcon, CalendarDays, MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { ThreadList } from '@/components/community/thread-list'
import { UserAvatar } from '@/components/community/user-avatar'
import { AwardGiver, BioEditor } from '@/components/community/forum-client'
import { AWARDS, awardById, type AwardTier } from '@/lib/awards'
import { awardsFor, communityEnabled, listThreads, profileByUsername, syncAwards, usernameFor } from '@/lib/community'
import { getSessionUserId } from '@/lib/supabase/auth'
import { isCurrentUserAdmin } from '@/lib/supabase/admin-guard'
import { shortDate } from '@/lib/admin/format'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return { title: username === 'me' ? 'Profile' : `@${username}` }
}

const TIER: Record<AwardTier, string> = {
  bronze: 'from-amber-700/25 to-amber-600/5 ring-amber-700/30',
  silver: 'from-slate-400/30 to-slate-300/5 ring-slate-400/40',
  gold: 'from-yellow-400/35 to-yellow-300/5 ring-yellow-500/40',
  special: 'from-coral/30 to-coral/5 ring-coral/40',
}

/** A member's public page: who they are, what they have solved, their awards and threads. */
export default async function MemberPage({ params }: { params: Promise<{ username: string }> }) {
  if (!communityEnabled()) notFound()
  const { username } = await params
  const viewer = await getSessionUserId()
  if (username === 'me') {
    const own = viewer ? await usernameFor(viewer) : null
    if (!own) notFound()
    redirect(`/u/${own}`)
  }
  const profile = await profileByUsername(username)
  if (!profile) notFound()
  const own = viewer === profile.id
  if (own) await syncAwards(profile.id)
  const [t, locale, held, threads, admin] = await Promise.all([getT(), getLocale(), awardsFor(profile.id), listThreads({ authorId: profile.id, limit: 10 }), isCurrentUserAdmin()])
  const heldIds = new Set(held.map((entry) => entry.award))
  const stats = [
    { label: t('Problems solved'), value: String(profile.solved) },
    { label: t('Accuracy'), value: profile.accuracy === null ? '—' : `${profile.accuracy}%` },
    { label: t('Active days'), value: String(profile.activeDays) },
    { label: t('Solutions on the forum'), value: String(profile.solutions) },
  ]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <section className={cn(cardClass, 'flex flex-wrap items-center gap-5 p-5 sm:p-6')}>
        <UserAvatar author={{ id: profile.id, name: profile.name, username: profile.username, hasAvatar: profile.hasAvatar }} size={72} link={false} />
        <div className="min-w-0 flex-1">
          <PageHeader title={profile.name} description={`@${profile.username}`} />
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {profile.grade ? <span>{t(profile.grade)}</span> : null}
            {profile.subject ? <span>{t(profile.subject)}</span> : null}
            {profile.isAdmin ? <span className="text-coral">{t('OlympAI team')}</span> : null}
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {t('since {date}', { date: shortDate(profile.joinedAt, locale) })}</span>
            <span className="inline-flex items-center gap-1"><MessageSquare className="size-3.5" /> {profile.threads + profile.replies}</span>
          </p>
          {profile.bio ? <p className="mt-3 max-w-2xl text-[15px] leading-6 whitespace-pre-line">{profile.bio}</p> : null}
          {own ? <div className="mt-3"><BioEditor initial={profile.bio ?? ''} /></div> : null}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={cn(cardClass, 'p-4')}>
            <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {profile.bySubject.length ? (
        <p className="-mt-2 text-sm text-muted-foreground">
          {profile.bySubject.map((row) => `${t(row.subject)}: ${row.solved}`).join(' · ')}
        </p>
      ) : null}

      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <h2 className="flex items-center gap-2 font-medium"><AwardIcon className="size-4 text-coral" /> {t('Awards')} <span className="text-sm font-normal text-muted-foreground">{held.length} / {AWARDS.length}</span></h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...held.map((entry) => ({ entry, award: awardById(entry.award) })).filter((x) => x.award), ...AWARDS.filter((award) => !heldIds.has(award.id)).map((award) => ({ entry: null, award }))].map(({ entry, award }) => (
            <li
              key={award!.id}
              className={cn(
                'flex gap-3 rounded-xl p-3 ring-1',
                entry ? cn('bg-gradient-to-br', TIER[award!.tier]) : 'opacity-45 ring-border',
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background/70 text-lg" aria-hidden>{award!.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t(award!.title)}</span>
                <span className="block text-xs text-muted-foreground">{entry?.note || t(award!.description)}</span>
                {entry ? <span className="mt-0.5 block text-[11px] text-muted-foreground">{shortDate(entry.createdAt, locale)}</span> : null}
              </span>
            </li>
          ))}
        </ul>
        {admin ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium">{t('Give or take back an award')}</p>
            <AwardGiver userId={profile.id} held={[...heldIds]} />
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">{t('Threads')}</h2>
        <ThreadList threads={threads} t={t} locale={locale} />
      </section>
    </div>
  )
}
