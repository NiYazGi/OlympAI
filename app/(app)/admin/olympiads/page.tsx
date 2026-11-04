import { CompetitionAdmin, type AdminCompetition } from '@/components/admin/competition-admin'
import { PageHeader } from '@/components/page-header'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Olympiads · Admin') }
}

export default async function AdminOlympiadsPage() {
  const t = await getT()

  const admin = await requireAdminPage()

  const [{ data: competitions }, { data: subjects }, { data: registrations }, { data: details }] = await Promise.all([
    admin
      .from('competitions')
      .select(
        'id, slug, name, subject_id, level, region, founded, official_url, papers_url, starts_on, ends_on, registration_deadline, registration_url, active',
      )
      .order('starts_on', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true }),
    admin.from('subjects').select('id, name').eq('active', true).order('name'),
    admin.from('competition_registrations').select('competition_id'),
    admin.from('competition_details').select('competition_id, locale, summary, format, route, eligibility'),
  ])

  const subjectName = new Map((subjects ?? []).map((row) => [row.id, row.name]))
  const registered = new Map<string, number>()
  for (const row of registrations ?? []) {
    registered.set(row.competition_id, (registered.get(row.competition_id) ?? 0) + 1)
  }
  const detailsOf = new Map<string, AdminCompetition['details']>()
  for (const row of details ?? []) {
    const current = detailsOf.get(row.competition_id) ?? {}
    current[row.locale as 'ru' | 'kk' | 'en'] = { summary: row.summary, format: row.format, route: row.route, eligibility: row.eligibility }
    detailsOf.set(row.competition_id, current)
  }

  return (
    <>
      <PageHeader
        title={t('Olympiads')}
        description={t('What students see on their Olympiads page. Only list real competitions with real dates.')}
      />
      <CompetitionAdmin
        subjects={(subjects ?? []).map((row) => ({ id: row.id, name: t(row.name) }))}
        competitions={(competitions ?? []).map((row) => ({
          ...row,
          subject: row.subject_id ? t(subjectName.get(row.subject_id) ?? '') || null : null,
          registered: registered.get(row.id) ?? 0,
          details: detailsOf.get(row.id) ?? {},
        }))}
      />
    </>
  )
}
