import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Check, X } from 'lucide-react'
import { Meter } from '@/components/meter'
import { PageHeader } from '@/components/page-header'
import { Reveal } from '@/components/reveal'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BlockSkeleton, ListSkeleton, PendingRegion } from '@/components/skeletons'
import { lastSeen } from '@/lib/class-copy'
import { getStudentDetail } from '@/lib/supabase/classes'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn, initials } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>
}) {
  const { id, studentId } = await params
  const detail = await getStudentDetail(id, studentId)
  const t = await getT()
  return { title: detail?.student.name ?? t('Student') }
}

/**
 * One student, for the teacher who noticed something on the roster.
 *
 * The roster answers "who needs me"; this answers "what do I say to them". So
 * it leads with the sections rather than the totals: "47 solved, 62%" is not
 * advice, and "inequalities, 31% over nine attempts" is.
 */
export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>
}) {
  const { id, studentId } = await params
  const [t, profile] = await Promise.all([getT(), getCurrentProfile()])
  if (profile?.role !== 'teacher') redirect('/class')

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href={`/class/${id}`}
        prefetch
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t('Back to the class')}
      </Link>
      <Reveal
        fallback={
          <>
            <PendingRegion label={t('Loading your classes')} />
            <BlockSkeleton className={`${cardClass} h-24`} />
            <ListSkeleton rows={4} />
          </>
        }
      >
        <Student classId={id} studentId={studentId} />
      </Reveal>
    </div>
  )
}

async function Student({ classId, studentId }: { classId: string; studentId: string }) {
  const [detail, t] = await Promise.all([getStudentDetail(classId, studentId), getT()])
  if (!detail) notFound()

  const { student } = detail
  const name = student.name?.trim() || '—'
  const joined = new Date(student.joinedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
  })

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-foreground/10 text-xs font-semibold">
                {initials(student.name)}
              </AvatarFallback>
            </Avatar>
            {name}
          </span>
        }
        description={`${detail.class.name} · ${t('Joined {date}', { date: joined })}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t('Solved')} value={String(student.solved)} />
        <Tile
          label={t('Accuracy')}
          value={student.accuracy === null ? '—' : `${student.accuracy}%`}
          unit={student.attempts > 0 ? t('over {n} {n|attempt|attempts}', { n: student.attempts }) : undefined}
        />
        <Tile
          label={t('Ready')}
          value={student.readiness ? `${student.readiness.percent}%` : '—'}
          unit={student.readiness ? t('{n}% of the route covered', { n: student.readiness.coverage }) : undefined}
        />
        <Tile label={t('Last seen')} value={lastSeen(student.lastActiveAt, t)} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t('Lessons read')} value={String(student.lessonsRead)} />
        <Tile label={t('Questions answered')} value={String(student.quizAnswers)} />
        <Tile label={t('Papers')} value={String(student.papers)} />
        <Tile
          label={t('Best paper')}
          value={student.bestPaper === null ? '—' : `${student.bestPaper}%`}
        />
      </div>

      {student.attempts === 0 ? (
        <p className={cn(cardClass, 'p-5 text-sm text-muted-foreground')}>
          {t('This student has not started yet.')}
        </p>
      ) : (
        <>
          <section className={cn(cardClass, 'p-5 sm:p-6')}>
            <h2 className={'eyebrow'}>{t('By section')}</h2>
            <ul className="mt-4 space-y-3.5">
              {detail.topics.map((entry) => (
                <li key={entry.topic}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{t(entry.topic)}</span>
                    <span className="shrink-0 font-mono tabular-nums">
                      {entry.accuracy}%{' '}
                      <span className="text-xs text-muted-foreground">
                        {t('over {n} {n|attempt|attempts}', { n: entry.attempts })}
                      </span>
                    </span>
                  </div>
                  <Meter value={entry.accuracy} className="mt-1.5" />
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className={'eyebrow'}>{t('Recent submissions')}</h2>
            <ul className="grid gap-2">
              {detail.recent.map((attempt, index) => (
                <li key={`${attempt.taskId}-${index}`}>
                  <Link
                    href={`/tasks/${attempt.taskId}`}
                    prefetch={false}
                    className={cn(cardClass, 'transition-colors hover:bg-white/[0.04]', 'flex items-center gap-3 p-3.5')}
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-lg',
                        attempt.isCorrect
                          ? 'bg-success/15 text-success'
                          : 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {attempt.isCorrect ? <Check className="size-4" /> : <X className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{attempt.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {attempt.topic ? (t(attempt.topic)) : ''}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {attempt.score}/100
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="text-sm leading-6 text-pretty text-muted-foreground">{t('Problems, sections, questions, reading and papers. Not the daily state diagram, and not what was asked of the tutor — sleep, state of mind and the questions somebody asks when they are stuck stay theirs.')}</p>
    </>
  )
}

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className={cn(cardClass, 'p-4')}>
      <p className={'eyebrow'}>{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold tabular-nums">
        {value}
        {unit ? (
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{unit}</span>
        ) : null}
      </p>
    </div>
  )
}
