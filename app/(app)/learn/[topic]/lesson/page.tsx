import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { LessonContent } from '@/components/learn/lesson-content'
import { LessonReader } from '@/components/learn/lesson-reader'
import { Attribution } from '@/components/resources/resource-list'
import { Badge } from '@/components/ui/badge'
import { getLesson } from '@/lib/supabase/study'
import { getDailySession } from '@/lib/supabase/daily-preparation'
import { getTaskCatalogue } from '@/lib/supabase/queries'
import type { Licence } from '@/lib/licence'
import { getT } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const lesson = await getLesson(topic)
  const t = await getT()
  return { title: lesson ? lesson.title : t('Lesson') }
}

export default async function LessonPage({ params, searchParams }: {
  params: Promise<{ topic: string }>
  searchParams: Promise<{ session?: string }>
}) {
  const t = await getT()

  const { topic } = await params
  const lesson = await getLesson(topic)
  if (!lesson) notFound()
  const { session: sessionId } = await searchParams
  const session = await getDailySession(sessionId)
  if (sessionId && (!session || session.lesson_id !== lesson.id)) notFound()
  const practice = session ? (await getTaskCatalogue()).filter((task) => session.task_ids.includes(task.id))
    .sort((a, b) => session.task_ids.indexOf(a.id) - session.task_ids.indexOf(b.id)) : []

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href={`/learn/${lesson.topicSlug}`}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t(lesson.topicName)}
      </Link>

      <PageHeader title={lesson.title} description={`${t(lesson.subjectName)} · ${t(lesson.topicName)}`}>
        {lesson.estimatedMinutes ? (
          <Badge variant="outline" className="gap-1.5">
            <Clock className="size-3" />
            {lesson.estimatedMinutes} {t('min')}
          </Badge>
        ) : null}
      </PageHeader>

      <LessonReader key={session?.id ?? lesson.id} lesson={lesson} sessionId={session?.id}
        dayCompleted={Boolean(session?.lesson_completed_at)} practiceHref={session?.task_ids[0] ? '/tasks/' + encodeURIComponent(session.task_ids[0]) : undefined}>
        <LessonContent lesson={lesson} />
      </LessonReader>

      {session ? (
        <section className="space-y-3 border-t border-border pt-5">
          <h2 className="text-lg font-semibold">{t('Practice for this study day')}</h2>
          <ol className="space-y-2">
            {practice.map((task, index) => (
              <li key={task.id}>
                <Link href={'/tasks/' + encodeURIComponent(task.id)} className="flex gap-3 rounded-lg bg-muted/60 px-4 py-3 text-sm hover:bg-ember">
                  <span className="text-muted-foreground tabular-nums">{index + 1}</span><span>{task.title}</span>
                </Link>
              </li>
            ))}
          </ol>
          <Link href={'/learn/' + lesson.topicSlug + '/quiz?session=' + session.id} className="inline-block text-sm font-medium text-coral hover:underline">
            {t('After the problems · take the quiz')}
          </Link>
        </section>
      ) : null}
      <Attribution
        licence={lesson.licence as Licence}
        attribution={lesson.attribution}
        url={lesson.sourceUrl}
      />
    </div>
  )
}
