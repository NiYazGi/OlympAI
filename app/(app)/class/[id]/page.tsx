import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, Link2, ListOrdered, TrendingDown, Users } from 'lucide-react'
import { DeleteClass } from '@/components/class/delete-class'
import { TrackEditor } from '@/components/class/track-editor'
import { InvitePanel } from '@/components/class/invite-panel'
import { RemoveStudent } from '@/components/class/member-actions'
import { Meter } from '@/components/meter'
import { PageHeader } from '@/components/page-header'
import { Reveal } from '@/components/reveal'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BlockSkeleton, ListSkeleton, PendingRegion } from '@/components/skeletons'
import { WEAK_BELOW, lastSeen } from '@/lib/class-copy'
import { DEFAULT_TARGET } from '@/lib/path'
import { getClassTrack } from '@/lib/supabase/track'
import { getClassDetail } from '@/lib/supabase/classes'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import type { StudentRow } from '@/lib/supabase/classes'
import { cardClass, cn, initials, labelClass, liftClass } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getClassDetail(id)
  const t = await getT()
  return { title: detail?.name ?? t.classes.title }
}

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [t, profile] = await Promise.all([getT(), getCurrentProfile()])

  // A student is a member of a class, not a reader of it. The policies would
  // already hand them a roster of one — themselves — but a page that renders
  // a roster at all is the wrong answer to the question they asked.
  if (profile?.role !== 'teacher') redirect('/class')

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href="/class"
        prefetch
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t.classes.title}
      </Link>
      <Reveal
        fallback={
          <>
            <PendingRegion label={t.classes.loading} />
            <BlockSkeleton className={`${cardClass} h-24`} />
            <ListSkeleton rows={4} />
          </>
        }
      >
        <Roster id={id} />
      </Reveal>
    </div>
  )
}

async function Roster({ id }: { id: string }) {
  const [detail, track, t] = await Promise.all([getClassDetail(id), getClassTrack(id), getT()])
  if (!detail) notFound()

  const subject = detail.subjectName
    ? (t.subjects[detail.subjectName] ?? detail.subjectName)
    : t.classes.bothSubjects

  return (
    <>
      <PageHeader
        title={detail.name}
        description={`${subject} · ${detail.studentCount > 0 ? t.classes.students(detail.studentCount) : t.classes.noStudents}`}
      />

      {detail.studentCount > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label={t.classes.studentsLabel} value={String(detail.studentCount)} />
          <Tile
            label={t.classes.activeThisWeek}
            value={String(detail.totals.activeThisWeek)}
            unit={`/ ${detail.studentCount}`}
          />
          <Tile label={t.classes.classSolved} value={String(detail.totals.solved)} />
          <Tile
            label={t.classes.classAccuracy}
            value={detail.totals.accuracy === null ? '—' : `${detail.totals.accuracy}%`}
            unit={detail.totals.attempts > 0 ? t.classes.attemptsIn(detail.totals.attempts) : undefined}
          />
        </div>
      ) : null}

      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <h2 className="flex items-center gap-2 font-semibold">
          <Link2 className="size-4 text-primary" />
          {t.classes.invite}
        </h2>
        <div className="mt-4">
          <InvitePanel classId={detail.id} code={detail.joinCode} />
        </div>
      </section>

      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <h2 className="flex items-center gap-2 font-semibold">
          <ListOrdered className="size-4 text-primary" />
          {t.classes.trackTitle}
        </h2>
        <div className="mt-4">
          <TrackEditor classId={detail.id} rows={track} defaultTarget={DEFAULT_TARGET} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={labelClass}>{t.classes.roster}</h2>
        {detail.students.length === 0 ? (
          <p className={cn(cardClass, 'p-5 text-sm text-muted-foreground')}>
            {t.classes.noStudents}
          </p>
        ) : (
          <ul className="grid gap-2">
            {detail.students.map((student) => (
              <StudentLine key={student.id} classId={detail.id} student={student} t={t} />
            ))}
          </ul>
        )}
      </section>

      {detail.students.length > 0 ? (
        <section className={cn(cardClass, 'p-5 sm:p-6')}>
          <h2 className="flex items-center gap-2 font-semibold">
            <TrendingDown className="size-4 text-primary" />
            {t.classes.classWeak}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t.classes.classWeakNote}</p>
          {detail.weakTopics.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t.classes.classWeakEmpty}</p>
          ) : (
            <ul className="mt-4 space-y-3.5">
              {detail.weakTopics.map((entry) => (
                <li key={entry.topic}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      {t.topics[entry.topic] ?? entry.topic}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums">
                      {entry.accuracy}%{' '}
                      <span className="text-xs text-muted-foreground">
                        {t.classes.attemptsIn(entry.attempts)}
                      </span>
                    </span>
                  </div>
                  <Meter value={entry.accuracy} className="mt-1.5" />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <h2 className="flex items-center gap-2 font-semibold">
          <Users className="size-4 text-primary" />
          {t.classes.privacy}
        </h2>
        <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">
          {t.classes.privacyNote}
        </p>
      </section>

      <DeleteClass classId={detail.id} />
    </>
  )
}

function StudentLine({
  classId,
  student,
  t,
}: {
  classId: string
  student: StudentRow
  t: Dictionary
}) {
  const name = student.name?.trim() || '—'
  const weakest = student.weakest.find((entry) => entry.accuracy < WEAK_BELOW)

  return (
    <li className={cn(cardClass, liftClass, 'flex items-center gap-2 pr-3')}>
      <Link
        href={`/class/${classId}/${student.id}`}
        prefetch={false}
        className="group flex min-w-0 flex-1 items-center gap-3 p-4"
      >
        <Avatar className="size-9 shrink-0">
          <AvatarFallback className="bg-foreground/10 text-xs font-semibold">
            {initials(student.name)}
          </AvatarFallback>
        </Avatar>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {t.classes.solved} {student.solved} · {t.classes.accuracy}{' '}
            {student.accuracy === null ? '—' : `${student.accuracy}%`} · {t.classes.lastSeen}:{' '}
            {lastSeen(student.lastActiveAt, t)}
          </span>
        </span>

        {weakest ? (
          <span className="hidden shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground sm:block">
            {t.topics[weakest.topic] ?? weakest.topic} {weakest.accuracy}%
          </span>
        ) : null}

        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
      <RemoveStudent classId={classId} studentId={student.id} name={name} />
    </li>
  )
}

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className={cn(cardClass, 'p-4')}>
      <p className={labelClass}>{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
        {value}
        {unit ? <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  )
}
