import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { QuizRunner } from '@/components/learn/quiz-runner'
import { getTopicQuiz } from '@/lib/supabase/study'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const quiz = await getTopicQuiz(topic)
  return { title: quiz ? `${quiz.topicName} quiz` : 'Quiz' }
}

export default async function QuizPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const quiz = await getTopicQuiz(topic)
  if (!quiz) notFound()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href={`/learn/${quiz.topicSlug}`}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {quiz.topicName}
      </Link>

      <PageHeader
        title="Check yourself"
        description={`${quiz.subjectName} · ${quiz.topicName}`}
      />

      {quiz.questions.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No questions for this topic yet"
          body="Nothing has been written for this topic. When it is, this is where the quick check will be."
          action={{ href: `/learn/${quiz.topicSlug}`, label: 'Back to the topic' }}
        />
      ) : (
        <QuizRunner quiz={quiz} />
      )}
    </div>
  )
}
