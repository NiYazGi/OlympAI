import { notFound } from 'next/navigation'
import { Clock } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { LessonReader } from '@/components/learn/lesson-reader'
import { Attribution } from '@/components/resources/resource-list'
import { Badge } from '@/components/ui/badge'
import { getLesson } from '@/lib/supabase/study'
import { getT } from '@/lib/i18n'
import type { Licence } from '@/lib/licence'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const [lesson, t] = await Promise.all([getLesson(topic), getT()])
  return { title: lesson ? lesson.title : t.lesson.fallbackTitle }
}

export default async function LessonPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const [lesson, t] = await Promise.all([getLesson(topic), getT()])
  if (!lesson) notFound()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      {/* How far through the notes the reader is, under the header. Driven by
          the scroll position in CSS, and fixed rather than in the flow, so it
          costs the page neither a layout slot nor a listener. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-14 z-20 md:top-0 h-0.5 overflow-hidden"
      >
        <div className="reading-progress h-full w-full bg-primary" />
      </div>

      <BackLink href={`/learn/${lesson.topicSlug}`}>{t.topics[lesson.topicName] ?? lesson.topicName}</BackLink>

      <PageHeader title={lesson.title} description={`${t.subjects[lesson.subjectName] ?? lesson.subjectName} · ${t.topics[lesson.topicName] ?? lesson.topicName}`}>
        {lesson.estimatedMinutes ? (
          <Badge variant="outline" className="gap-1.5">
            <Clock className="size-3" />
            {t.tasks.minutes(lesson.estimatedMinutes)}
          </Badge>
        ) : null}
      </PageHeader>

      <LessonReader lesson={lesson} />

      <Attribution
        licence={lesson.licence as Licence}
        attribution={lesson.attribution}
        url={lesson.sourceUrl}
      />
    </div>
  )
}
