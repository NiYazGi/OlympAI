import type { ReactNode } from 'react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { EndGoal } from '@/components/method/end-goal'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

/** One coach's rules, the reasons the day is scored the way it is. */
const RULES = [
  { title: 'Two to three hours a day', body: 'Every day, including the ones where nothing is due. The habit is what carries you through the fortnight that is coming, and a week of nothing costs more than the hours it took.', where: 'Theory and Solving, on the day\'s score' },
  { title: 'Ten to twelve hours in the last two weeks', body: 'The final stretch is a different kind of work, not more of the same. Two weeks is short enough to survive at that load and long enough to change the result.', where: 'The same two axes, in the last fortnight' },
  { title: 'Lights out by 22:30, from two weeks out', body: 'Not for the rest. You cannot decide to fall asleep the night before the paper — you can only have been falling asleep at that hour for a fortnight already. That night is the one being rehearsed.', where: 'Sleep, in the last fortnight' },
  { title: 'The last two days: nothing', body: 'Stop completely. Two days of rest costs nothing you could have learnt in them, and it is what makes you arrive hungry for the paper rather than sick of the subject.', where: 'Theory and Solving invert in the taper' },
  { title: 'Do not prepare alone', body: 'Alone it is a grind, and a grind stops. Other people are where the problems you would never have picked come from, and where the reason to keep going comes from when the score is flat.', where: 'No axis of its own — but working alone hits Head first' },
  { title: 'One thing at a time', body: 'An olympiad takes the whole of your attention. Run a startup or a side project in the same season and the olympiad is the thing that gives way — which is why the app scores a split day at nought rather than at half.', where: 'Taken: the more the rest of life took, the fewer points' },
  { title: 'More than 15 out of 25, every day', body: 'Five axes, 5 points each, and they are interchangeable on purpose. Short of the bar by five, you can solve another problem — or you can go to bed, which is worth the same five and is usually the one you were not going to spend. Reading the diagram that way is the point of having one.', where: 'The diagram on the dashboard' },
  { title: 'The medal is not the goal', body: 'You set the goals; a coach is there to get you to them. And the last one is not a place at an olympiad — it is what the place opens, which is usually a university.', where: 'Under your target, on the dashboard' },
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

      <PageHeader title={t('The method')} description={t('How one coach prepares students, and why the app counts the day the way it does.')} />

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
