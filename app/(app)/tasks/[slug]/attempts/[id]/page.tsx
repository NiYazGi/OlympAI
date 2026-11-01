import { notFound } from 'next/navigation'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { MathParagraphs } from '@/components/math-text'
import { AttemptList } from '@/components/problems/attempt-list'
import { AttemptProtocol } from '@/components/problems/attempt-protocol'
import { getAttemptDetail, getTaskAttemptHistory, getTaskDetail } from '@/lib/supabase/queries'
import { getSessionUserId } from '@/lib/supabase/auth'
import { getLocale, getT } from '@/lib/i18n'
import { formatDay } from '@/lib/i18n/config'
import { cardClass, cn, labelClass } from '@/lib/utils'

// Per request: the attempt is behind RLS and belongs to one student.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [task, t] = await Promise.all([getTaskDetail(slug), getT()])
  return { title: task ? `${t.protocol.title}: ${task.title}` : t.protocol.title }
}

/**
 * One attempt's protocol, at an address of its own.
 *
 * The solution panel shows the same protocol the moment it is graded; this is
 * where it can be found again a week later, from the list of attempts, and the
 * page a teacher is sent to. The statement stays beside it, because a mark on a
 * line means little without the condition the line was answering.
 */
export default async function AttemptPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const [attempt, task, t, locale, userId] = await Promise.all([
    getAttemptDetail(id),
    getTaskDetail(slug),
    getT(),
    getLocale(),
    getSessionUserId(),
  ])
  // An attempt read under someone else's address is not this page's to show.
  if (!attempt || !task || attempt.taskId !== task.id) notFound()

  // The list of attempts is the student's own. A teacher reading this protocol
  // has the student's list on the class pages instead.
  const own = attempt.userId === userId
  const history = own ? await getTaskAttemptHistory(task.id) : []

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <BackLink href={`/tasks/${task.id}`}>{t.protocol.back}</BackLink>

      <PageHeader
        title={task.title}
        description={t.protocol.attemptOn(formatDay(attempt.createdAt.slice(0, 10), locale))}
      />

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start">
        <section className={cn(cardClass, 'p-6 lg:sticky lg:top-20 lg:col-span-5')}>
          <h2 className={labelClass}>{t.tasks.problem}</h2>
          <div className="mt-3 space-y-3">
            <MathParagraphs
              text={task.problem}
              className="font-reading max-w-[68ch] text-reading text-foreground"
              figureAlt={t.tasks.diagramAlt(task.title)}
            />
          </div>
        </section>

        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className={cn(cardClass, 'p-5 sm:p-6')}>
            <AttemptProtocol protocol={attempt.protocol} />
          </div>
          {own ? <AttemptList taskId={task.id} attempts={history} current={attempt.id} /> : null}
        </div>
      </div>
    </div>
  )
}
