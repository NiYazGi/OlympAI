import { Reveal } from '@/components/reveal'
import Link from 'next/link'
import { ArrowRight, LogOut, Palette, Plus, ShieldCheck, User } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Appearance } from '@/components/settings/appearance'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/auth/actions'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { cardClass, cn } from '@/lib/utils'

export const metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader title="Settings" description="Appearance, your account, and how you leave it." />

      <Section icon={Palette} title="Appearance">
        <Appearance />
      </Section>

      <Reveal
        fallback={
          <>
            <PendingRegion label="Loading your account" />
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
  const profile = await getCurrentProfile()

  return (
    <>
      <Section icon={User} title="Account">
        <dl className="divide-y divide-border text-sm">
          <Row label="Name" value={profile?.full_name ?? '—'} />
          <Row label="Grade" value={profile?.grade ?? 'Not set'} />
          <Row label="Primary subject" value={profile?.primary_subject ?? 'Not set'} />
          <Row label="Level" value={profile?.level ?? 'Not set'} />
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">
          These are edited under{' '}
          <Link href="/me" prefetch className="text-primary hover:underline">
            Me
          </Link>
          , alongside your progress.
        </p>
      </Section>

      {profile?.is_admin ? (
        <Section icon={ShieldCheck} title="Content">
          <p className="text-sm leading-6 text-muted-foreground">
            Add lectures and readings to a task or a topic. Every item records where it came from
            and what may be done with it.
          </p>
          <Button
            className="mt-4"
            nativeButton={false}
            render={
              <Link href="/settings/material" prefetch>
                <Plus className="size-4" /> Add material
              </Link>
            }
          />
        </Section>
      ) : null}

      {/*
        Log out lives here rather than in the navigation. A destructive action
        one stray click from every screen is a trap, especially on a rail where
        the target was an unlabelled icon.
      */}
      <Section icon={LogOut} title="Session">
        <p className="text-sm text-muted-foreground">
          You will be returned to the login page. Nothing you have submitted is lost.
        </p>
        <form action={signOut} className="mt-4">
          <Button variant="outline" type="submit">
            <LogOut className="size-4" /> Log out
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
