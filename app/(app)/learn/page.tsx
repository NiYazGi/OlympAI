import { Reveal } from '@/components/reveal'
import Link from 'next/link'
import { ViewTransition } from 'react'
import { GraduationCap } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { NextActionCard, ScopeNote } from '@/components/learn/next-action-card'
import { GoalSetup } from '@/components/path/goal-setup'
import { GoalSummary } from '@/components/path/goal-summary'
import { TargetPicker } from '@/components/path/target-picker'
import { WeekRhythm } from '@/components/path/week-rhythm'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { getNextAction, getStudyOverview } from '@/lib/supabase/study'
import {
  getCompetitionOptions,
  getCurrentProfile,
  getGoal,
  getProgressAnalytics,
  getSubjectSummary,
  getTaskCatalogue,
} from '@/lib/supabase/queries'
import { buildPath } from '@/lib/path'
import { planForGoal, readiness } from '@/lib/goal'
import { getStudentTrack } from '@/lib/supabase/track'
import { getT } from '@/lib/i18n'
import { cardClass, cn, liftClass, riseDelay } from '@/lib/utils'

export const metadata = { title: 'Learn' }
export const dynamic = 'force-dynamic'

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>
}) {
  const [{ all }, t] = await Promise.all([searchParams, getT()])

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader title={t.learn.title} description={t.learn.description} />
      <Reveal
        fallback={
          <>
            <PendingRegion label={t.learn.loading} />
            <BlockSkeleton className={`${cardClass} h-40`} />
          </>
        }
      >
        <Plan showAll={all === '1'} />
      </Reveal>
    </div>
  )
}

async function Plan({ showAll }: { showAll: boolean }) {
  const [action, surface, goal, competitions, subjects, analytics, tasks, profile, t] =
    await Promise.all([
      getNextAction(),
      getStudyOverview(showAll),
      getGoal(),
      getCompetitionOptions(),
      getSubjectSummary(),
      getProgressAnalytics(),
      getTaskCatalogue(),
      getCurrentProfile(),
      getT(),
    ])
  const track = await getStudentTrack()

  // Choosing the target is the first step, not a separate page. Until it is
  // answered there is nothing to order the topics by, so the form is the whole
  // page rather than one card among several.
  if (!goal.competition || !goal.targetDate) {
    return (
      <GoalSetup
        competitions={competitions}
        currentId={goal.competition?.id ?? null}
        currentDate={goal.targetDate}
        preferredType={profile?.target_competition_type ?? null}
      />
    )
  }

  // A generic target — a national round, say — names no subject of its own.
  if (!goal.subjectName) {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          {t.learn.multiSubject(goal.competition.name)}
        </p>
        <TargetPicker subjects={subjects} current={goal.subjectId} />
      </>
    )
  }

  const path = buildPath(tasks, goal.subjectName, track.track)
  const attemptsLastWeek = analytics.recentActivity.reduce((sum, day) => sum + day.problems, 0)
  const plan = planForGoal(path, goal.targetDate, attemptsLastWeek, profile?.training_intensity ?? null)
  const ready = readiness(path, analytics.totalAttempts > 0 ? analytics.accuracy : null)

  return (
    <>
      <GoalSummary
        goal={goal}
        plan={plan}
        ready={ready}
        competitions={competitions}
        subjects={subjects}
        next={path.next}
      />

      <NextActionCard action={action} />

      <div className="flex flex-col gap-4">
        <ScopeNote
          subject={surface.goalSubject}
          scoped={surface.scoped}
          hidden={surface.hiddenSubjects}
          allHref="/learn?all=1"
          focusHref="/learn"
        />

        {surface.subjects.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={t.learn.emptyTitle}
            body={t.learn.emptyBody}
            action={{ href: '/tasks', label: t.learn.emptyAction }}
          />
        ) : (
          surface.subjects.map((subject) => (
            <section key={subject.name} className="space-y-3">
              {surface.subjects.length > 1 ? (
                <div className="flex items-baseline justify-between gap-3 pt-2">
                  <h2 className="font-semibold">{t.subjects[subject.name] ?? subject.name}</h2>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {subject.percent}%
                  </span>
                </div>
              ) : null}

              <ul className="grid gap-3 sm:grid-cols-2">
                {subject.topics.map((topic, index) => (
                  <li key={topic.id} className="rise" style={riseDelay(index)}>
                    <Link
                      href={`/learn/${topic.slug}`}
                      prefetch
                      className={cn(cardClass, liftClass, 'block p-4 sm:p-5')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium">
                          {/* Paired with the heading on the topic page: the
                              name moves rather than being replaced. */}
                          <ViewTransition
                            name={`topic-${topic.slug}`}
                            share="morph"
                            default="none"
                          >
                            <span>{t.topics[topic.name] ?? topic.name}</span>
                          </ViewTransition>
                        </h3>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                          {topic.percent}%
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {topic.next
                          ? t.learn.nextIs(topic.next.label, topic.next.detail)
                          : t.learn.nothingLeft}
                      </p>

                      {/* What is actually in the topic. A card that only says
                          what to do next gives no way to tell a topic with a
                          lesson and twelve problems from one with a stub. */}
                      <p className="mt-2 text-caption text-muted-foreground">
                        {[
                          topic.input.lesson ? t.common.blocks(topic.input.lesson.blocks) : null,
                          topic.input.quiz.total ? t.common.questions(topic.input.quiz.total) : null,
                          topic.input.tasks.total ? t.common.problems(topic.input.tasks.total) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || t.learn.nothingWritten}
                      </p>

                      <div className="mt-3 flex gap-1">
                        {topic.stages.map((stage) => (
                          <span
                            key={stage.key}
                            title={`${stage.label}: ${stage.detail}`}
                            className={cn(
                              'h-1 flex-1 rounded-full',
                              stage.state === 'done'
                                ? 'bg-primary'
                                : stage.state === 'in-progress'
                                  ? 'bg-primary/40'
                                  : stage.state === 'empty'
                                    ? 'bg-muted'
                                    : 'bg-foreground/15',
                            )}
                          />
                        ))}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <WeekRhythm analytics={analytics} intensity={profile?.training_intensity ?? null} />
    </>
  )
}
