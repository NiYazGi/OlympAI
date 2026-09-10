import { Reveal } from '@/components/reveal'
import Link from 'next/link'
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Flame,
  GraduationCap,
  Lock,
  Target,
  Trophy,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { ProfilePreferences } from '@/components/profile-preferences'
import { AccuracyTrendChart, ActivityChart, TopicBarChart } from '@/components/charts'
import { BlockSkeleton, PendingRegion, StatCardsSkeleton } from '@/components/skeletons'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { signOut } from '@/app/auth/actions'
import { buildAchievements } from '@/lib/achievements'
import { getCurrentProfile, getProgressAnalytics } from '@/lib/supabase/queries'
import { cardClass, cn, initials } from '@/lib/utils'

export const metadata = { title: 'Me' }

/**
 * Everything about the student in one place.
 *
 * Progress used to be a tab of its own. Splitting "who I am" from "how I am
 * doing" made two pages that were each half an answer, and the analytics were
 * the half nobody went looking for.
 */
export default function MePage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader title="Me" description="Your setup, your numbers and what you have earned.">
        <form action={signOut}>
          <Button variant="outline" type="submit">
            Log out
          </Button>
        </form>
      </PageHeader>
      <Reveal
        fallback={
          <>
            <PendingRegion label="Loading your account" />
            <BlockSkeleton className={`${cardClass} h-44`} />
            <StatCardsSkeleton />
          </>
        }
      >
        <MeBody />
      </Reveal>
    </div>
  )
}

async function MeBody() {
  const [profile, analytics] = await Promise.all([getCurrentProfile(), getProgressAnalytics()])
  const achievements = buildAchievements(analytics)
  const earned = achievements.filter((achievement) => achievement.earned).length
  const ordered = [...achievements].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1
    return b.progress - a.progress
  })

  const fresh = !analytics.hasData
  const stats = [
    { label: 'Attempts', value: String(analytics.totalAttempts), muted: fresh },
    { label: 'Solved', value: String(analytics.correctAnswers), muted: fresh },
    { label: 'Accuracy', value: fresh ? '0%' : `${analytics.accuracy}%`, muted: fresh },
    {
      label: 'Day streak',
      value: String(analytics.activeStreak),
      muted: analytics.activeStreak === 0,
    },
  ]

  return (
    <>
      <section className={`${cardClass} p-6`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar className="size-16 shrink-0 rounded-2xl ring-1 ring-foreground/10">
            <AvatarFallback className="rounded-2xl text-lg">
              {initials(profile?.full_name ?? null)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold">
              {profile?.full_name ?? 'Your account'}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {profile?.grade ? (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="size-4" />
                  {profile.grade}
                </span>
              ) : null}
              {profile?.primary_subject ? (
                <span className="flex items-center gap-1.5">
                  <Target className="size-4" />
                  {profile.primary_subject}
                </span>
              ) : null}
              {profile?.level ? (
                <span className="flex items-center gap-1.5">
                  <Trophy className="size-4" />
                  {profile.level}
                </span>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 text-center sm:text-right">
            <p className="text-2xl font-semibold tabular-nums">
              {analytics.xp.total.toLocaleString('en')}
            </p>
            <p className="text-xs text-muted-foreground">XP · level {analytics.xp.level}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-6 sm:grid-cols-4 sm:gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p
                className={cn(
                  'text-2xl font-semibold tabular-nums',
                  stat.muted && 'text-muted-foreground/50',
                )}
              >
                {stat.value}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <h2 className="mt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Progress
      </h2>

      {analytics.hasData ? (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className={`${cardClass} p-4 sm:p-6`}>
              <h3 className="font-semibold">Topic mastery</h3>
              <p className="mt-1 text-sm text-muted-foreground">Accuracy from graded attempts</p>
              <div className="mt-4">
                <TopicBarChart
                  data={analytics.topics.map((item) => ({
                    topic: item.topic,
                    accuracy: item.mastery,
                  }))}
                />
              </div>
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {analytics.topics.map((topic) => (
                  <li key={topic.topic}>
                    {topic.topic}: {topic.correct}/{topic.attempts}
                  </li>
                ))}
              </ul>
            </section>

            <section className={`${cardClass} p-4 sm:p-6`}>
              <h3 className="font-semibold">Recent activity</h3>
              <p className="mt-1 text-sm text-muted-foreground">Attempts in the last 7 days</p>
              <div className="mt-4">
                <ActivityChart data={analytics.recentActivity} />
              </div>
            </section>
          </div>

          {analytics.accuracyTrend.length > 1 ? (
            <section className={`${cardClass} p-4 sm:p-6`}>
              <h3 className="font-semibold">Accuracy by week</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Share of correct submissions, week by week
              </p>
              <div className="mt-4">
                <AccuracyTrendChart data={analytics.accuracyTrend} />
              </div>
            </section>
          ) : null}

          <div className="grid gap-5 md:grid-cols-3">
            <section className={`${cardClass} p-5`}>
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-primary" />
                <h3 className="font-semibold">Train next</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {analytics.weakTopics[0]
                  ? `${analytics.weakTopics[0]} needs more focused practice.`
                  : 'Nothing below 70% — step up the difficulty.'}
              </p>
            </section>

            <section className={`${cardClass} p-5`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <h3 className="font-semibold">Strong topics</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {analytics.strongTopics.length
                  ? analytics.strongTopics.join(', ')
                  : 'Keep practising to identify your strongest.'}
              </p>
            </section>

            <section className={`${cardClass} p-5`}>
              <h3 className="font-semibold">Review mistakes</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {analytics.recentMistakes.length ? (
                  analytics.recentMistakes.map((task) => <li key={task}>• {task}</li>)
                ) : (
                  <li>Nothing incorrect to review.</li>
                )}
              </ul>
            </section>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Target}
          title="Your numbers start with one attempt"
          body="Submit a solution and this section fills in: accuracy, mastery per topic, your streak, and what to practise next."
          action={{ href: '/tasks', label: 'Browse tasks' }}
        />
      )}

      <h2 className="mt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Achievements
      </h2>

      <section className={`${cardClass} p-6`}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-semibold">
            {earned} of {achievements.length} earned
          </h3>
          <Link href="/mock" prefetch className="text-sm font-medium text-primary hover:underline">
            Take a mock <ArrowRight className="inline size-3.5" />
          </Link>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          {earned === 0
            ? 'Nothing yet — the first one needs a single solved task.'
            : 'Closest to unlocking, first.'}
        </p>

        <ul className="grid gap-3 sm:grid-cols-2">
          {ordered.map((achievement) => (
            <li
              key={achievement.name}
              className={cn(
                'flex items-center gap-3 rounded-xl p-4 ring-1',
                achievement.earned ? 'bg-accent ring-primary/20' : 'bg-muted/30 ring-border',
              )}
            >
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full',
                  achievement.earned
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {achievement.earned ? <Award className="size-4" /> : <Lock className="size-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{achievement.name}</p>
                <p className="mt-0.5 text-pretty text-xs text-muted-foreground">
                  {achievement.description}
                </p>
                {!achievement.earned && achievement.progress > 0 ? (
                  <Progress value={achievement.progress} className="mt-2 h-1" />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <h2 className="mt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Settings
      </h2>

      <ProfilePreferences
        initial={{
          primary_subject: profile?.primary_subject ?? undefined,
          level: profile?.level ?? undefined,
          goal: profile?.goal ?? undefined,
          training_intensity: profile?.training_intensity ?? undefined,
        }}
      />
    </>
  )
}
