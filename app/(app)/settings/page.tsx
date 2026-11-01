import { Reveal } from '@/components/reveal'
import Link from 'next/link'
import { ArrowRight, LogOut, Palette, Plus, ShieldCheck, User } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Appearance } from '@/components/settings/appearance'
import { TelegramLink } from '@/app/(app)/settings/telegram'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/auth/actions'
import { getMemberships } from '@/lib/supabase/classes'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n'
import { cardClass, cn } from '@/lib/utils'

export async function generateMetadata() {
  const t = await getT()
  return { title: t.settings.title }
}

export default async function SettingsPage() {
  const t = await getT()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader title={t.settings.title} description={t.settings.description} />

      <Section icon={Palette} title={t.settings.appearance}>
        <Appearance />
      </Section>

      <Reveal
        fallback={
          <>
            <PendingRegion label={t.settings.loading} />
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
  const isTeacher = profile?.role === 'teacher'
  // A teacher has no grade and no subject of their own, and rows reading "not
  // set" three times over would be answering questions nobody asked them.
  const memberships = isTeacher ? [] : await getMemberships()

  return (
    <>
      <Section icon={User} title={t.settings.account}>
        <dl className="divide-y divide-border text-sm">
          <Row label={t.settings.name} value={profile?.full_name ?? '—'} />
          <Row
            label={t.settings.accountType}
            value={isTeacher ? t.classes.teacher : t.classes.student}
          />
          {isTeacher ? null : (
            <>
              <Row label={t.settings.grade} value={profile?.grade ?? t.settings.notSet} />
              <Row
                label={t.settings.primarySubject}
                value={
                  profile?.primary_subject
                    ? (t.subjects[profile.primary_subject] ?? profile.primary_subject)
                    : t.settings.notSet
                }
              />
              <Row label={t.settings.level} value={profile?.level ?? t.settings.notSet} />
              <Row
                label={t.settings.classRow}
                value={
                  memberships.length > 0
                    ? memberships.map((membership) => membership.name).join(', ')
                    : t.settings.notSet
                }
              />
            </>
          )}
        </dl>
        {isTeacher ? (
          <p className="mt-4 text-sm text-muted-foreground">
            <Link href="/class" prefetch className="text-primary hover:underline">
              {t.classes.title}
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {t.settings.editedUnder}{' '}
            <Link href="/me" prefetch className="text-primary hover:underline">
              {t.me.title}
            </Link>
            {t.settings.alongside}
          </p>
        )}
      </Section>

      {profile?.is_admin ? (
        <Section icon={ShieldCheck} title={t.settings.content}>
          <p className="text-sm leading-6 text-muted-foreground">{t.settings.contentNote}</p>
          <Button
            className="mt-4"
            nativeButton={false}
            render={
              <Link href="/settings/material" prefetch>
                <Plus className="size-4" /> {t.settings.addMaterial}
              </Link>
            }
          />
        </Section>
      ) : null}

      {isTeacher ? null : <TelegramLink />}

      {/*
        Log out lives here rather than in the navigation. A destructive action
        one stray click from every screen is a trap, especially on a rail where
        the target was an unlabelled icon.
      */}
      <Section icon={LogOut} title={t.settings.session}>
        <p className="text-sm text-muted-foreground">{t.settings.sessionNote}</p>
        <form action={signOut} className="mt-4">
          <SubmitButton variant="outline" pendingLabel={t.me.loggingOut}>
            <LogOut className="size-4" /> {t.me.logOut}
          </SubmitButton>
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
    <section className={cn(cardClass, 'p-5 sm:p-6')}>
      <h2 className="flex items-center gap-2 font-semibold">
        <Icon className="size-4 text-primary" />
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
