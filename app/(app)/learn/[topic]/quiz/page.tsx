import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { QuizRunner } from '@/components/learn/quiz-runner'
import { getTopicQuiz } from '@/lib/supabase/study'
import { getDailySession } from '@/lib/supabase/daily-preparation'
import { getT } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const quiz = await getTopicQuiz(topic)
  const t = await getT()
  return { title: quiz ? t('{topic} quiz', { topic: t(quiz.topicName) }) : t('Quiz') }
}

export default async function QuizPage({ params, searchParams }: {
  params: Promise<{ topic: string }>
  searchParams: Promise<{ session?: string }>
}) {
  const t = await getT()

  const { topic } = await params
  const { session: sessionId } = await searchParams
  const session = await getDailySession(sessionId)
  if (sessionId && !session) notFound()
  const quiz = await getTopicQuiz(topic, session?.question_ids)
  if (!quiz) notFound()
  if (session && quiz.questions.length !== session.question_ids.length) notFound()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href={`/learn/${quiz.topicSlug}`}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t(quiz.topicName)}
      </Link>

      <PageHeader
        title={t('Check yourself')}
        description={`${t(quiz.subjectName)} · ${t(quiz.topicName)}`}
      />

      {quiz.questions.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={t('No questions for this topic yet')}
          body={t('Nothing has been written for this topic. When it is, this is where the quick check will be.')}
          action={{ href: `/learn/${quiz.topicSlug}`, label: t('Back to the topic') }}
        />
      ) : (
        <QuizRunner key={session?.id ?? topic} quiz={quiz} sessionId={session?.id} />
      )}
    </div>
  )
}
