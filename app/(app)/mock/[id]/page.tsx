import { getT } from '@/lib/i18n'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { CountUp } from '@/components/count-up'
import { Meter } from '@/components/meter'
import { PageHeader } from '@/components/page-header'
import { ExamRunner } from '@/components/mock/exam-runner'
import { DifficultyStars } from '@/components/difficulty-stars'
import { getMockPaper } from '@/lib/supabase/queries'
import { cardClass, cn } from '@/lib/utils'

export async function generateMetadata() {
  const t = await getT()
  return { title: t.exam.metaTitle }
}
export const dynamic = 'force-dynamic'

export default async function MockTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [paper, t] = await Promise.all([getMockPaper(id), getT()])
  if (!paper) notFound()

  return (
      <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
        <BackLink href="/mock">{t.exam.back}</BackLink>

        {paper.submittedAt ? <Results paper={paper} /> : <Sitting paper={paper} />}
      </div>
  )
}

function Sitting({ paper }: { paper: NonNullable<Awaited<ReturnType<typeof getMockPaper>>> }) {
  return (
    <>
      <PageHeader
        title={`${paper.subject} mock`}
        description={`${paper.questions.length} questions · ${paper.durationMinutes} minutes · no hints, no Sulu`}
      />
      <ExamRunner paper={paper} />
    </>
  )
}

function Results({ paper }: { paper: NonNullable<Awaited<ReturnType<typeof getMockPaper>>> }) {
  const score = paper.scorePercent ?? 0
  const answered = paper.questions.filter((question) => question.answer !== null).length

  return (
    <>
      <PageHeader
        title={`${paper.subject} mock — result`}
        description={new Date(paper.submittedAt!).toLocaleDateString('en', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      />

      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {/* The score is the news on this page, so it counts up to itself
              once — the one number in the app that does. */}
          <CountUp
            value={score}
            suffix="%"
            delay={150}
            className="font-display text-5xl leading-none font-bold tabular-nums"
          />
          <span className="text-lg font-medium text-primary">{paper.level}</span>
        </div>
        <Meter value={score} className="mt-4 h-2" label="Score" />
        <p className="mt-3 text-sm text-muted-foreground">
          {answered} of {paper.questions.length} questions answered. The score weights each
          question by its difficulty, so the hard ones count for more. This level now sits on your
          profile.
        </p>
      </section>

      <ol className="space-y-4">
        {paper.questions.map((question, index) => {
          const skipped = question.answer === null
          const correct = question.isCorrect === true
          return (
            <li key={question.id} className={cn(cardClass, 'p-5')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold">
                  {skipped ? (
                    <Clock className="size-4 shrink-0 text-muted-foreground" />
                  ) : correct ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : (
                    <TrendingUp className="size-4 shrink-0 text-primary" />
                  )}
                  Question {index + 1}. {question.title}
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
                <p className="font-reading mt-3 text-sm leading-relaxed text-foreground/90">
                  {question.feedback}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Left blank. Open the task to work through it without the clock.
                </p>
              )}

              <Link
                href={`/tasks/${question.id}`}
                prefetch
                className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
              >
                Practise this one →
              </Link>
            </li>
          )
        })}
      </ol>
    </>
  )
}
