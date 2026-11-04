import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { MathText } from '@/components/math-text'
import { AttemptProtocol } from '@/components/problems/attempt-protocol'
import { AttemptHistory } from '@/components/problems/attempt-history'
import { getAttemptDetail, getTaskDetail, getTaskHistory, getTaskReports } from '@/lib/supabase/queries'
import { getSessionUserId } from '@/lib/supabase/auth'
import { getLocale, getT } from '@/lib/i18n/server'
import { formatDate } from '@/lib/i18n/config'
import { cardClass, cn } from '@/lib/utils'

// Per request: the attempt is behind RLS and belongs to one student.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [task, t] = await Promise.all([getTaskDetail(slug), getT()])
  return { title: task ? `${t('Attempt review')}: ${task.title}` : t('Attempt review') }
}

/**
 * One attempt's protocol, at an address of its own.
 *
 * The solution panel shows the same protocol the moment it is graded; this is
 * where it can be found again a week later, from the list of attempts, and the
 * page a teacher is sent to. The statement stays beside it, because a mark on a
 * line means little without the condition the line was answering.
 */
export default async function AttemptPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
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
  const [history, reports] = own ? await Promise.all([getTaskHistory(task.id), getTaskReports(task.id)]) : [[], []]

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href={own ? `/tasks/${task.id}` : '/class'}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {own ? t('Back to the problem') : t('Back to the class')}
      </Link>

      <PageHeader
        title={task.title}
        description={t('Attempt of {date}', {
          date: formatDate(new Date(attempt.createdAt), locale, { day: 'numeric', month: 'long', year: 'numeric' }),
        })}
      />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <section className={cn(cardClass, 'min-w-0 p-4 sm:p-6 lg:sticky lg:top-20 lg:col-span-5')}>
          <h2 className="eyebrow">{t('Problem')}</h2>
          <MathText text={task.problem} className="mt-3 break-words text-foreground" />
        </section>

        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          <div className={cn(cardClass, 'p-5 sm:p-6')}>
            <AttemptProtocol protocol={attempt.protocol} />
          </div>
          {own ? <AttemptHistory taskId={task.id} attempts={history} reports={reports} /> : null}
        </div>
      </div>
    </div>
  )
}
