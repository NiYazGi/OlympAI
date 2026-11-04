import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { ActionButton } from '@/components/admin/action-button'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { deleteClass, removeClassMember } from '@/app/(app)/admin/site/actions'
import { getDb } from '@/lib/db'
import { ago, shortDate } from '@/lib/admin/format'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Classes · Admin') }
}

type ClassRow = {
  id: string
  name: string
  join_code: string
  created_at: string
  teacher_id: string
  teacher: string | null
  teacher_email: string
  subject: string | null
  members: number
  files: number
  tasks: number
}

type Member = { class_id: string; student_id: string; name: string | null; email: string; joined_at: string; attempts: number }

/** Every class on the site, its teacher and its students. */
export default async function AdminClassesPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()])
  await requireAdminPage()
  const db = await getDb()
  const [{ rows: classes }, { rows: members }] = await Promise.all([
    db.query<ClassRow>(`
      select c.id, c.name, c.join_code, c.created_at, c.teacher_id, p.full_name as teacher, u.email as teacher_email,
             s.name as subject,
             (select count(*) from public.class_members m where m.class_id = c.id)::int as members,
             (select count(*) from public.class_files f where f.class_id = c.id)::int as files,
             (select count(*) from public.tasks tk where tk.class_id = c.id)::int as tasks
        from public.classes c
        join auth.users u on u.id = c.teacher_id
        left join public.profiles p on p.id = c.teacher_id
        left join public.subjects s on s.id = c.subject_id
       order by c.created_at desc`),
    db.query<Member>(`
      select m.class_id, m.student_id, p.full_name as name, u.email, m.joined_at,
             (select count(*) from public.task_attempts a where a.user_id = m.student_id)::int as attempts
        from public.class_members m
        join auth.users u on u.id = m.student_id
        left join public.profiles p on p.id = m.student_id
       order by m.joined_at`),
  ])

  return (
    <>
      <PageHeader
        title={t('Classes')}
        description={t('Every class teachers have made. Deleting a class removes its plan, its own problems and its files; the students keep their accounts.')}
        note={<p className="font-mono text-[11px] text-smoke">{t('{n} classes · {m} students in them', { n: classes.length, m: members.length })}</p>}
      />
      {classes.length ? (
        <div className="grid gap-3">
          {classes.map((row) => {
            const roster = members.filter((member) => member.class_id === row.id)
            return (
              <details key={row.id} className={cn(cardClass, 'group overflow-hidden')}>
                <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{row.name}</p>
                    <p className="mt-1 truncate text-xs text-ash">
                      <Link href={`/admin/users/${row.teacher_id}`} className="hover:text-white">
                        {row.teacher || row.teacher_email}
                      </Link>
                      {row.subject ? ` · ${t(row.subject)}` : ''} · {shortDate(row.created_at, locale)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-smoke">
                    {row.join_code} · {t('{n} students', { n: row.members })} · {t('{n} problems', { n: row.tasks })} · {t('{n} files', { n: row.files })}
                  </span>
                </summary>
                <div className="border-t border-white/[0.06] px-5 py-4">
                  {roster.length ? (
                    <ul className="divide-y divide-white/[0.04]">
                      {roster.map((member) => (
                        <li key={member.student_id} className="flex items-center gap-3 py-2.5">
                          <Link href={`/admin/users/${member.student_id}`} className="min-w-0 flex-1 truncate text-sm text-white hover:underline">
                            {member.name || member.email}
                          </Link>
                          <span className="shrink-0 font-mono text-[11px] text-smoke">
                            {t('{n} att.', { n: member.attempts })} · {ago(member.joined_at, t, locale)}
                          </span>
                          <ActionButton
                            action={removeClassMember.bind(null, row.id, member.student_id)}
                            confirm={t('Remove {name} from this class?', { name: member.name || member.email })}
                            variant="ghost"
                            size="xs"
                          >
                            {t('Remove')}
                          </ActionButton>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ash">{t('Nobody has joined yet.')}</p>
                  )}
                  <div className="mt-4">
                    <ActionButton
                      action={deleteClass.bind(null, row.id)}
                      confirm={t('Delete the class “{name}”? Its plan, problems and files go with it.', { name: row.name })}
                      variant="destructive"
                    >
                      {t('Delete class')}
                    </ActionButton>
                  </div>
                </div>
              </details>
            )
          })}
        </div>
      ) : (
        <p className={cn(cardClass, 'p-6 text-sm text-ash')}>{t('No classes yet.')}</p>
      )}
    </>
  )
}
