import { notFound } from 'next/navigation'
import { Lock } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { GateForm } from '@/app/gate/gate-form'
import { gatePassword, safeNext } from '@/lib/site-gate'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  // Metadata streams first; without this the live site answered 200 here.
  if (!gatePassword()) notFound()
  const t = await getT()
  return { title: t('Test site'), robots: { index: false, follow: false } }
}

/** The password page in front of the test deployment; absent everywhere else. */
export default async function GatePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!gatePassword()) notFound()
  const [t, params] = await Promise.all([getT(), searchParams])
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <section className={cn(cardClass, 'w-full max-w-sm space-y-5 p-6')}>
        <BrandMark />
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Lock className="size-4" /> {t('Test site')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('This is the OlympAI test version. Enter the password to continue.')}
          </p>
        </div>
        <GateForm next={safeNext(params.next)} />
      </section>
    </main>
  )
}
