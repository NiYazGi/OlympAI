import type { ReactNode } from 'react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { EndGoal } from '@/components/method/end-goal'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

/** One coach's way of preparing, written as advice rather than as a norm for everyone. */
const RULES = [
  { title: 'Your study schedule', body: 'Follow the study days and time you chose for your plan. An hour a day is a full plan, not a lesser one.', where: 'Preparation program' },
  { title: 'Final two weeks', body: 'Use your study time for timed practice and reviewing mistakes. A longer, more intense run-up is something to agree with your coach, not a rule for everyone.', where: 'Mock tests' },
  { title: 'Last two days', body: 'Final two days for light review and rest.', where: 'Preparation program' },
  { title: 'Do not prepare alone', body: 'Alone it is a grind, and a grind stops. Other people are where the problems you would never have picked come from, and where the reason to keep going comes from when the score is flat.', where: 'Classes and Sulu' },
  { title: 'One main project per season', body: 'An olympiad season goes best with one main project. When school, sport or family take up a day, that is not a failure: the plan for that day gets lighter instead of you being marked down.', where: 'Preparation program' },
  { title: 'Rest is part of the plan', body: 'Sleep and rest are not a debt to pay off with extra problems. Teenagers usually need 8 to 10 hours of sleep. After a short night or a heavy day the plan is shortened, with the reason shown.', where: 'Preparation program' },
  { title: 'The medal is not the goal', body: 'You set the goals; a coach is there to get you to them. And the last one is not a place at an olympiad — it is what the place opens, which is usually a university.', where: 'Your goal, below' },
]

export async function generateMetadata() {
  const t = await getT()
  return { title: t('The method') }
}
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
      <BackLink href="/dashboard">{t('Dashboard')}</BackLink>

      <PageHeader title={t('The method')} description={t('How one coach prepares students, adapted to the time each student actually has.')} />

      {/* The rules are numbered, and the numbering is the argument: they are
          taken in order through a season, not picked from. */}
      <ol className="space-y-3">
        {RULES.map((rule, index) => (
          <Rule key={rule.title} n={index + 1} title={t(rule.title)} where={t(rule.where)}>
            {t(rule.body)}
          </Rule>
        ))}
      </ol>

      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <h2 className={'eyebrow'}>{t('What this is for')}</h2>
        <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">
          {t('Write down the end of it. It appears under your target, where you will see it on the evenings the target is not reason enough.')}
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
