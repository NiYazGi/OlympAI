import type { ReactNode } from 'react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { EndGoal } from '@/components/method/end-goal'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n'
import { cardClass, cn, labelClass } from '@/lib/utils'

export const metadata = { title: 'The method' }
export const dynamic = 'force-dynamic'

/**
 * The rules the day's score is built from, written out.
 *
 * They are here rather than spread across the screens they affect for two
 * reasons. A rule needs its argument the first time you meet it and never
 * again, and a dashboard that carries the argument every morning is a
 * dashboard nobody reads. And several of them contradict what a training app
 * usually says — stop working, go to bed, do less — so they have to be stated
 * somewhere as a position rather than surfacing as an odd nudge.
 *
 * This is one coach's method, not a finding. It is written as advice, with its
 * reasoning attached, so a student can disagree with a part of it and keep the
 * rest.
 */
export default async function MethodPage() {
  const [profile, t] = await Promise.all([getCurrentProfile(), getT()])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <BackLink href="/dashboard">{t.nav.dashboard}</BackLink>

      <PageHeader title={t.method.title} description={t.method.description} />

      {/* The rules are numbered, and the numbering is the argument: they are
          taken in order through a season, not picked from. */}
      <ol className="space-y-3">
        {t.method.rules.map((rule, index) => (
          <Rule key={rule.title} n={index + 1} title={rule.title} where={rule.where}>
            {rule.body}
          </Rule>
        ))}
      </ol>

      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <h2 className={labelClass}>{t.method.endTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">
          {t.method.endBody}
        </p>
        <EndGoal current={profile?.target_university ?? null} />
      </section>
    </div>
  )
}

function Rule({
  n,
  title,
  where,
  children,
}: {
  n: number
  title: string
  where: string
  children: ReactNode
}) {
  return (
    <li className={cn(cardClass, 'flex gap-4 p-5')}>
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {String(n).padStart(2, '0')}
      </span>
      <div className="min-w-0">
        <h2 className="font-semibold text-balance">{title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-pretty text-muted-foreground">{children}</p>
        <p className="mt-2 text-caption text-muted-foreground">
          {where}
        </p>
      </div>
    </li>
  )
}
