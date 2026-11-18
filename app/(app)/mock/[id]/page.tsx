import { PrintButton } from '@/components/print-button'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Clock, TrendingUp, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { PreparationMockReview } from '@/components/preparation/mock-review'
import { ExamRunner } from '@/components/mock/exam-runner'
import { DifficultyStars } from '@/components/difficulty-stars'
import { getMockPaper, getTaskCatalogue } from '@/lib/supabase/queries'
import { similarTasks } from '@/lib/mock-lifecycle'
import { MAX_POINTS } from '@/lib/protocol'
import { cardClass, cn } from '@/lib/utils'
import { getLocale, getT } from '@/lib/i18n/server'
import { formatDate } from '@/lib/i18n/config'
import { MathText } from '@/components/math-text'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Mock test') }
}
export const dynamic = 'force-dynamic'

export default async function MockTestPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT()

  const { id } = await params
  const paper = await getMockPaper(id)
  if (!paper) notFound()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href={paper.preparation ? '/dashboard' : '/mock'}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t(paper.preparation ? 'Back to preparation route' : 'All mock tests')}
      </Link>

      {paper.submittedAt ? <Results paper={paper} /> : paper.abandonedAt ? <Closed /> : <Sitting paper={paper} />}
    </div>
  )
}

async function Sitting({ paper }: { paper: NonNullable<Awaited<ReturnType<typeof getMockPaper>>> }) {
  const t = await getT()
  return (
    <>
      <PageHeader
        title={t('{subject} mock', { subject: t(paper.subject) })}
        description={t('{q} questions · {m} minutes · no hints, no Sulu', { q: paper.questions.length, m: paper.durationMinutes })}
      >
        <PrintButton label={t('Print the paper')} />
      </PageHeader>
      <ExamRunner
        paper={paper}
        statements={Object.fromEntries(paper.questions.map((question) => [question.id, <MathText key={question.id} text={question.problem} />]))}
      />
    </>
  )
}

async function Results({ paper }: { paper: NonNullable<Awaited<ReturnType<typeof getMockPaper>>> }) {
  const t = await getT()
  const catalogue = await getTaskCatalogue()

  const score = paper.scorePercent ?? 0
  const answered = paper.questions.filter((question) => question.answer !== null).length
  // The review: where the points went, and what to solve next to win them back.
  const lost = paper.questions.map((question) => ({
    question,
    lost: MAX_POINTS - (question.points ?? (question.answer === null ? 0 : Math.round(((question.score ?? 0) * MAX_POINTS) / 100))),
  }))
  const totalLost = lost.reduce((sum, row) => sum + row.lost, 0)
  const used = new Set(paper.questions.map((question) => question.id))
  const fixes = new Map(
    lost
      .filter((row) => row.lost > 0)
      .map((row) => {
        const picks = similarTasks(catalogue, { id: row.question.id, subject: row.question.subject, topic: row.question.topic, difficulty: row.question.difficulty }, 2, used)
        picks.forEach((task) => used.add(task.id))
        return [row.question.id, picks] as const
      }),
  )

  return (
    <>
      <PageHeader
        title={t('{subject} mock — result', { subject: t(paper.subject) })}
        description={formatDate(new Date(paper.submittedAt!), await getLocale(), {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      />

      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-4xl font-semibold tabular-nums">{score}%</span>
          <span className="text-lg font-medium text-primary">{paper.level ? t(paper.level) : null}</span>
          {paper.late ? (
            <span className="rounded-md bg-warning/10 px-2 py-0.5 text-sm text-warning">{t('Handed in after the time')}</span>
          ) : null}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {answered} {t('of')} {paper.questions.length} {t(paper.preparation
            ? 'questions answered. Review the feedback before your next session.'
            : 'questions answered. The score weights each question by its difficulty, so the hard ones count for more.')}{' '}
          {paper.preparation
            ? null
            : paper.late
              ? t('The answers were handed in after the clock ran out, so this counts as a review after the paper: it does not change your level.')
              : paper.levelApplied
                ? t('This level now sits on your profile.')
                : t('Your profile level is for your main subject, so this paper does not change it.')}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {t('Each answer is marked on the OlympAI training scale, out of 7. It is not the official jury score of the round.')}
        </p>
      </section>

      {totalLost > 0 ? (
        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <h2 className="font-medium">{t('Review of the paper')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('{n} of {max} points lost. Below each problem: where it broke and two new problems on the same idea, to solve without help.', { n: totalLost, max: paper.questions.length * MAX_POINTS })}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {lost.filter((row) => row.lost > 0).sort((a, b) => b.lost - a.lost).map((row) => (
              <li key={row.question.id} className="flex flex-wrap justify-between gap-2">
                <a href={`#q-${row.question.id}`} className="min-w-0 truncate hover:underline">{row.question.title}</a>
                <span className="shrink-0 font-mono text-xs text-destructive tabular-nums">−{row.lost}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ol className="space-y-4">
        {paper.questions.map((question, index) => {
          const skipped = question.answer === null
          const correct = question.isCorrect === true
          return (
            <li key={question.id} id={`q-${question.id}`} className={cn(cardClass, 'scroll-mt-20 p-5')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-medium">
                  {skipped ? (
                    <Clock className="size-4 shrink-0 text-muted-foreground" />
                  ) : correct ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : (
                    <TrendingUp className="size-4 shrink-0 text-primary" />
                  )}
                  {t('Question')} {index + 1}. {question.title}
                </h2>
                <div className="flex items-center gap-3">
                  <DifficultyStars level={question.difficulty} />
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      skipped ? 'text-muted-foreground' : 'text-primary',
                    )}
                  >
                    {skipped ? 'skipped' : `${question.score}/100`}
                  </span>
                </div>
              </div>

              {question.feedback ? (
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  {question.feedback}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t('Left blank. Open the task to work through it without the clock.')}
                </p>
              )}

              {question.breakNeed || (question.summary && !correct) ? (
                <p className="mt-3 rounded-lg bg-foreground/[0.04] px-3 py-2 text-sm">
                  <span className="font-medium">{t('Why points were lost')}: </span>
                  {question.breakNeed ?? question.summary}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                <Link href={`/tasks/${question.id}`} prefetch className="font-medium text-primary hover:underline">
                  {t('Practise this one →')}
                </Link>
                {question.attemptId && !correct ? (
                  <Link href={`/tasks/${question.id}/attempts/${question.attemptId}#appeal`} className="text-muted-foreground hover:text-foreground hover:underline">
                    {t('Dispute the mark')}
                  </Link>
                ) : null}
              </div>
              {fixes.get(question.id)?.length ? (
                <div className="mt-3 border-t border-border pt-3 text-sm">
                  <p className="text-xs text-muted-foreground">{t('To fix it — new problems on the same idea, without hints:')}</p>
                  <ul className="mt-1.5 space-y-1">
                    {fixes.get(question.id)!.map((task) => (
                      <li key={task.id}>
                        <Link href={`/tasks/${task.id}`} className="hover:text-primary hover:underline">{task.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
      {paper.preparation ? (
        <PreparationMockReview id={paper.id} reviewed={paper.reviewed} hasMistakes={paper.questions.some((question) => !question.isCorrect)} />
      ) : null}
    </>
  )
}

/** A paper closed without handing in: nothing was graded and nothing blocks a new one. */
async function Closed() {
  const t = await getT()
  return (
    <section className={cn(cardClass, 'p-5 sm:p-6')}>
      <h1 className="text-xl font-semibold">{t('This paper was closed without handing in')}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {t('Its time ran out, or it was closed by hand. It was not graded and does not count anywhere. A new paper can be started at any time.')}
      </p>
      <Link href="/mock" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">{t('Mock tests')} →</Link>
    </section>
  )
}
