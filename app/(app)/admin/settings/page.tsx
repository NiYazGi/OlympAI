import { PageHeader } from '@/components/page-header'
import { ActionButton } from '@/components/admin/action-button'
import { AnnouncementForm } from '@/components/admin/announcement-form'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { setSignupsOpen } from '@/app/(app)/admin/site/actions'
import { getSiteSettings } from '@/lib/admin/settings'
import { getSystemInfo } from '@/lib/admin/stats'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Settings · Admin') }
}

export const dynamic = 'force-dynamic'

/** The switches that affect everyone: the banner, sign-ups, and what is running. */
export default async function AdminSettingsPage() {
  const t = await getT()
  await requireAdminPage()
  const [settings, system] = await Promise.all([getSiteSettings(), getSystemInfo()])

  const info: [string, string][] = [
    [t('Database size'), system?.db_size ?? '—'],
    [t('Migrations applied'), String(system?.migrations ?? '—')],
    [t('Latest migration'), system?.last_migration ?? '—'],
    [t('Grader'), process.env.OPENAI_API_KEY ? `${t('configured')} · ${process.env.SULU_MODEL ?? 'gpt-5.4-mini'}` : t('not configured')],
    [t('Mail'), process.env.MAIL_API_URL ? t('configured') : t('not configured — codes go to the server log')],
    [t('Telegram bot'), process.env.TELEGRAM_BOT_TOKEN ? t('configured') : t('not configured')],
  ]

  return (
    <>
      <PageHeader title={t('Settings')} description={t('Switches that affect everyone on the site.')} />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <section className={cn(cardClass, 'space-y-4 p-5 sm:p-6')}>
          <h2 className="text-[15px] font-medium text-white">{t('Announcement banner')}</h2>
          <AnnouncementForm current={settings.announcement} />
        </section>

        <div className="flex flex-col gap-4">
          <section className={cn(cardClass, 'space-y-3 p-5 sm:p-6')}>
            <h2 className="text-[15px] font-medium text-white">{t('Sign-ups')}</h2>
            <p className="text-sm text-ash">
              {settings.signupsOpen
                ? t('Open: anyone can create an account.')
                : t('Closed: the sign-up page says so, and nobody new can create an account. Everyone else signs in as usual.')}
            </p>
            <ActionButton
              action={setSignupsOpen.bind(null, !settings.signupsOpen)}
              confirm={settings.signupsOpen ? t('Close sign-ups for everyone?') : undefined}
              variant={settings.signupsOpen ? 'destructive' : 'default'}
            >
              {settings.signupsOpen ? t('Close sign-ups') : t('Open sign-ups')}
            </ActionButton>
          </section>

          <section className={cn(cardClass, 'p-5 sm:p-6')}>
            <h2 className="text-[15px] font-medium text-white">{t('System')}</h2>
            <dl className="mt-3 divide-y divide-white/[0.04] text-sm">
              {info.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2">
                  <dt className="text-ash">{label}</dt>
                  <dd className="text-right font-mono text-[12px] text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </>
  )
}
