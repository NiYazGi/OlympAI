import { Reveal } from '@/components/reveal'
import Link from 'next/link'
import { ViewTransition } from 'react'
import { CalendarRange, GraduationCap } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { ScopeNote } from '@/components/learn/next-action-card'
import { GoalSetup } from '@/components/path/goal-setup'
import { GoalSummary } from '@/components/path/goal-summary'
import { TargetPicker } from '@/components/path/target-picker'
import { BlockSkeleton, PendingRegion } from '@/components/skeletons'
import { getStudyOverview } from '@/lib/supabase/study'
import {
  getCompetitionOptions,
  getCurrentProfile,
  getGoal,
  getSubjectSummary,
} from '@/lib/supabase/queries'
import { cardClass, cn, riseDelay } from '@/lib/utils'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Learn') }
}
export const dynamic = 'force-dynamic'

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>
}) {
  const t = await getT()

  const { all } = await searchParams

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader
        title={t('Learn')}
        description={t('Your target, and the route to it: read it, check you followed it, remember it, then solve with it.')}
      >
        <Link
          href="/plan"
          prefetch
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-foreground/[0.03] px-3 text-sm text-foreground shadow-key hover:bg-foreground/[0.07]"
        >
          <CalendarRange className="size-4" /> {t('Preparation program')}
        </Link>
      </PageHeader>
      <Reveal
        fallback={
          <>
            <PendingRegion label={t('Working out what to do next')} />
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
  const t = await getT()

  const [surface, goal, competitions, subjects, profile] =
    await Promise.all([
      getStudyOverview(showAll),
      getGoal(),
      getCompetitionOptions(),
      getSubjectSummary(),
      getCurrentProfile(),
    ])

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
          {goal.competition.name} {t('covers more than one subject — choose the one you are training in.')}
        </p>
        <TargetPicker subjects={subjects} current={goal.subjectId} />
      </>
    )
  }

  return (
    <>
      <GoalSummary
        goal={goal}
        competitions={competitions}
        subjects={subjects}
      />

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
            title={t('No topics yet')}
            body={t('Subjects and topics arrive with the reference content. Once they do, every one of them gets the same five steps.')}
            action={{ href: '/tasks', label: t('Browse problems') }}
          />
        ) : (
          surface.subjects.map((subject) => (
            <section key={subject.name} className="space-y-3">
              {surface.subjects.length > 1 ? (
                <div className="flex items-baseline justify-between gap-3 pt-2">
                  <h2 className="font-medium">{t(subject.name)}</h2>
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
                      className={cn(cardClass, 'block p-4 transition-colors hover:bg-muted/50 sm:p-5')}
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
                            <span>{t(topic.name)}</span>
                          </ViewTransition>
                        </h3>
                        <span title="Зачтённые действия маршрута; подробности на странице темы" className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                          {topic.metrics.coverage.ready ? `${topic.percent}%` : '—'}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {topic.next
                          ? t('Next: {label} — {detail}', { label: topic.next.label, detail: topic.next.detail })
                          : !topic.metrics.coverage.ready
                            ? 'Маршрут ещё не подготовлен'
                            : topic.metrics.coverage.complete
                              ? 'Все доступные действия пройдены. Освоение навыков — отдельно.'
                              : 'Доступные шаги пройдены · материалы ещё дополняются'}
                      </p>

                      <p className="mt-2 text-xs text-muted-foreground">Материалы: {topic.metrics.coverage.available}/3 · Навыки: {topic.metrics.skills.some((skill) => skill.confirmed) ? `${topic.metrics.skills.filter((skill) => skill.confirmed).length} подтверждено` : 'недостаточно данных'}</p>
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

    </>
  )
}
