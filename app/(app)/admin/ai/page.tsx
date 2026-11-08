import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { AiProfiles, AiPrompts } from '@/components/admin/ai-admin'
import { requireAdminPage } from '@/lib/supabase/admin-guard'
import { activeProfileId, listProfiles } from '@/lib/ai/profiles'
import { getAllPrompts } from '@/lib/ai/prompts'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('AI · Admin') }
}

export default async function AdminAiPage() {
  await requireAdminPage()
  const [t, profiles, activeId, prompts] = await Promise.all([getT(), listProfiles(), activeProfileId(), getAllPrompts()])

  return (
    <>
      <PageHeader
        title={t('AI')}
        description={t('Which API the site’s AI runs on, and the instructions for every task that uses it: chat, hints, grading, photo reading and card drafts.')}
      />

      <section className="space-y-3">
        <h2 className="text-[15px] font-medium text-foreground">{t('API profiles')}</h2>
        <p className="text-sm text-ash">{t('Switching takes effect from the next request, for every student.')}</p>
        <AiProfiles profiles={profiles} activeId={activeId} />
      </section>

      <section className="space-y-3">
        <h2 className="text-[15px] font-medium text-foreground">{t('Prompts')}</h2>
        <div className={cn(cardClass, 'flex items-start gap-3 p-4 text-sm text-ash')}>
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          <p>
            {t('Every prompt ends with a fixed rule the admin panel cannot remove: the assistant is Sulu AI by OlympAI and never names the model or provider behind it. Replies are also checked on the way out, and any model or vendor name is replaced.')}
          </p>
        </div>
        <AiPrompts prompts={prompts} />
      </section>
    </>
  )
}
