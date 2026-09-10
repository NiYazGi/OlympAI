import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { LessonReader } from '@/components/learn/lesson-reader'
import { Attribution } from '@/components/resources/resource-list'
import { Badge } from '@/components/ui/badge'
import { getLesson } from '@/lib/supabase/study'
import type { Licence } from '@/lib/licence'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const lesson = await getLesson(topic)
  return { title: lesson ? lesson.title : 'Lesson' }
}

export default async function LessonPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const lesson = await getLesson(topic)
  if (!lesson) notFound()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href={`/learn/${lesson.topicSlug}`}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {lesson.topicName}
      </Link>

      <PageHeader title={lesson.title} description={`${lesson.subjectName} · ${lesson.topicName}`}>
        {lesson.estimatedMinutes ? (
          <Badge variant="outline" className="gap-1.5">
            <Clock className="size-3" />
            {lesson.estimatedMinutes} min
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
