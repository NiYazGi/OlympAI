import { notFound } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { QuizRunner } from '@/components/learn/quiz-runner'
import { getTopicQuiz } from '@/lib/supabase/study'
import { getT } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const [quiz, t] = await Promise.all([getTopicQuiz(topic), getT()])
  return { title: quiz ? t.quiz.metaTitle(quiz.topicName) : t.quiz.fallbackTitle }
}

export default async function QuizPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const [quiz, t] = await Promise.all([getTopicQuiz(topic), getT()])
  if (!quiz) notFound()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <BackLink href={`/learn/${quiz.topicSlug}`}>{t.topics[quiz.topicName] ?? quiz.topicName}</BackLink>

      <PageHeader
        title={t.quiz.title}
        description={`${t.subjects[quiz.subjectName] ?? quiz.subjectName} · ${t.topics[quiz.topicName] ?? quiz.topicName}`}
      />

      {quiz.questions.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={t.quiz.emptyTitle}
          body={t.quiz.emptyBody}
          action={{ href: `/learn/${quiz.topicSlug}`, label: t.quiz.backToTopic }}
        />
      ) : (
        <QuizRunner quiz={quiz} />
      )}
    </div>
  )
}
