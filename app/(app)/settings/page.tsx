import { Reveal } from '@/components/reveal'
import Link from 'next/link'
import { Languages, LogOut, Plus, ShieldCheck, User } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/auth/actions'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { cardClass, cn } from '@/lib/utils'
import { getT } from '@/lib/i18n/server'
import { LanguageSwitcher } from '@/components/language-switcher'
import { TelegramLink } from '@/app/(app)/settings/telegram'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Settings') }
}

export default async function SettingsPage() {
  const t = await getT()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader title={t('Settings')} description={t('Your account, and how you leave it.')} />

      <Reveal
        fallback={
          <>
            <PendingRegion label={t('Loading your account')} />
            <BlockSkeleton className={`${cardClass} h-40`} />
          </>
        }
      >
        <Account />
      </Reveal>
    </div>
  )
}

async function Account() {
  const t = await getT()

  const profile = await getCurrentProfile()

  return (
    <>
      <Section icon={User} title={t('Account')}>
        <dl className="divide-y divide-border text-sm">
          <Row label={t('Name')} value={profile?.full_name ?? '—'} />
          <Row label={t('Grade')} value={profile?.grade ? t(profile.grade) : t('Not set')} />
          <Row label={t('Primary subject')} value={profile?.primary_subject ? t(profile.primary_subject) : t('Not set')} />
          <Row label={t('Level')} value={profile?.level ? t(profile.level) : t('Not set')} />
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">
          {t('These are edited under')}{' '}
          <Link href="/me" prefetch className="text-primary hover:underline">
            {t('Me')}
          </Link>
          {t(', alongside your progress.')}
        </p>
      </Section>

      <Section icon={Languages} title={t('Language')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {t('The interface language. Problems are shown in the language they were published in — the olympiad archive is in Russian, the short lessons are in English. Sulu replies in this language.')}
          </p>
          <LanguageSwitcher full className="shadow-key" />
        </div>
      </Section>

      {/* The evening check-in bot asks about a student's own day. */}
      {profile?.role === 'teacher' ? null : <TelegramLink />}

      {profile?.is_admin ? (
        <Section icon={ShieldCheck} title={t('Admin')}>
          <p className="text-sm leading-6 text-muted-foreground">
            {t('Manage users and olympiads, and add lectures and readings to a task or a topic. Every item records where it came from and what may be done with it.')}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              render={
                <Link href="/admin" prefetch>
                  <ShieldCheck className="size-4" /> {t('Open admin panel')}
                </Link>
              }
            />
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link href="/settings/material" prefetch>
                  <Plus className="size-4" /> {t('Add material')}
                </Link>
              }
            />
          </div>
        </Section>
      ) : null}

      {/*
        Log out lives here rather than in the navigation. A destructive action
        one stray click from every screen is a trap, especially on a rail where
        the target was an unlabelled icon.
      */}
      <Section icon={LogOut} title={t('Session')}>
        <p className="text-sm text-muted-foreground">
          {t('You will be returned to the login page. Nothing you have submitted is lost.')}
        </p>
        <form action={signOut} className="mt-4">
          <Button variant="outline" type="submit">
            <LogOut className="size-4" /> {t('Log out')}
          </Button>
        </form>
      </Section>
    </>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section className={cn(cardClass, 'p-6')}>
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <span className="flex size-7 items-center justify-center rounded-full bg-graphite text-mist">
          <Icon className="size-3.5" />
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-medium">{value}</dd>
    </div>
  )
}
