import Link from 'next/link'
import { ArrowRight, GraduationCap, Plus, Users } from 'lucide-react'
import { CreateClass } from '@/components/class/create-class'
import { EmptyState } from '@/components/empty-state'
import { JoinClass } from '@/components/class/join-class'
import { LeaveClass } from '@/components/class/member-actions'
import { PageHeader } from '@/components/page-header'
import { Reveal } from '@/components/reveal'
import { BlockSkeleton, ListSkeleton, PendingRegion } from '@/components/skeletons'
import { getMemberships, getTeacherClasses } from '@/lib/supabase/classes'
import { getClassMaterials } from '@/lib/supabase/class-materials'
import { ClassMaterialsPanel } from '@/components/class/class-materials'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getReference } from '@/lib/supabase/reference'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Classes') }
}

/**
 * One route, two readers.
 *
 * A teacher opens this and sees the classes they run. A student opens it and
 * sees the one they are in, or a box to type a code into. The role decides,
 * and it decides here rather than in the navigation, so a link that reaches
 * the wrong account still shows that account something true.
 */
export default async function ClassPage() {
  const [t, profile] = await Promise.all([getT(), getCurrentProfile()])
  const isTeacher = profile?.role === 'teacher'

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <PageHeader
        title={isTeacher ? t('Classes') : t('Your class')}
        description={isTeacher ? t('Your classes, and how each student is getting on.') : undefined}
      />
      <Reveal
        fallback={
          <>
            <PendingRegion label={t('Loading your classes')} />
            <ListSkeleton rows={2} />
            <BlockSkeleton className={`${cardClass} h-40`} />
          </>
        }
      >
        {isTeacher ? <TeacherClasses /> : <StudentClasses />}
      </Reveal>
    </div>
  )
}

async function TeacherClasses() {
  const [classes, reference, t] = await Promise.all([getTeacherClasses(), getReference(), getT()])
  const subjects = reference.subjects.map((subject) => ({
    slug: subject.slug,
    name: subject.name,
  }))

  return (
    <>
      {classes.length === 0 ? (
        <EmptyState icon={Users} title={t('No classes yet')} body={t('A class is a roster and a code. Make one, send the link to your students, and their work appears here.')} />
      ) : (
        <ul className="grid gap-2" data-tour="class-list">
          {classes.map((row) => (
            <li key={row.id}>
              <Link
                href={`/class/${row.id}`}
                prefetch={false}
                className={cn(cardClass, 'transition-colors hover:bg-white/[0.04]', 'group flex items-center gap-3 p-4')}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                  <Users className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{row.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {row.subjectName
                      ? t(row.subjectName)
                      : t('Both')}
                    {' · '}
                    {row.studentCount > 0 ? t('{n} {n|student|students}', { n: row.studentCount }) : t('Nobody has joined yet')}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm tracking-[0.18em] text-muted-foreground">
                  {row.joinCode}
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className={cn(cardClass, 'p-5 sm:p-6')} data-tour="class-create">
        <h2 className="flex items-center gap-2 font-semibold">
          <Plus className="size-4 text-primary" />
          {t('Create a class')}
        </h2>
        <div className="mt-4">
          <CreateClass subjects={subjects} />
        </div>
      </section>

      <p className="text-sm leading-6 text-pretty text-muted-foreground">{t('Problems, sections, questions, reading and papers. Not the daily state diagram, and not what was asked of the tutor — sleep, state of mind and the questions somebody asks when they are stuck stay theirs.')}</p>
    </>
  )
}

async function StudentClasses() {
  const [memberships, t] = await Promise.all([getMemberships(), getT()])

  return (
    <>
      {memberships.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={t('You are not in a class')}
          body={t('A class is optional. If your teacher runs one, they will give you a code — joining lets them see the work you do here.')}
        />
      ) : (
        <ul className="grid gap-2">
          {memberships.map((row) => (
            <li key={row.id} className={cn(cardClass, 'flex items-center gap-3 p-4')}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                <Users className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{row.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {row.teacherName ? `${t('Teacher')}: ${row.teacherName}` : null}
                  {row.teacherName && row.subjectName ? ' · ' : null}
                  {row.subjectName ? t(row.subjectName) : null}
                </span>
              </span>
              <LeaveClass classId={row.id} />
            </li>
          ))}
        </ul>
      )}

      {memberships.map((row) => (
        <ClassMaterialsSection key={row.id} classId={row.id} name={row.name} />
      ))}

      <section className={cn(cardClass, 'p-5 sm:p-6')}>
        <h2 className={'eyebrow'}>{t('Join a class')}</h2>
        <p className="mt-2 mb-4 text-sm text-muted-foreground">{t('Your teacher gives you a code of six characters, or a link that carries it.')}</p>
        <JoinClass />
      </section>

      <p className="text-sm leading-6 text-pretty text-muted-foreground">{t('Problems, sections, questions, reading and papers. Not the daily state diagram, and not what was asked of the tutor — sleep, state of mind and the questions somebody asks when they are stuck stay theirs.')}</p>
    </>
  )
}

/** What the teacher of one class has added: their problems and their files. */
async function ClassMaterialsSection({ classId, name }: { classId: string; name: string }) {
  const [materials, t] = await Promise.all([getClassMaterials(classId), getT()])
  return (
    <section className={cn(cardClass, 'p-5 sm:p-6')}>
      <h2 className="font-display text-block font-semibold">{t('Class material')}</h2>
      <p className="mt-1 text-ui text-muted-foreground">
        {name}. {t('Problems and files from your teacher.')}
      </p>
      <div className="mt-5">
        <ClassMaterialsPanel classId={classId} materials={materials} editable={false} />
      </div>
    </section>
  )
}
