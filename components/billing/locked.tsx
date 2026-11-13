import Link from 'next/link'
import { Lock } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { FEATURE_LABEL, FEATURE_PLAN, PLAN_NAME, type Feature } from '@/lib/plan-features'
import { getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

/** In place of a paid feature: what it is, which plan has it, and the way there. */
export async function Locked({ feature, className, compact = false }: { feature: Feature; className?: string; compact?: boolean }) {
  const t = await getT()
  const plan = PLAN_NAME[FEATURE_PLAN[feature]]
  return (
    <section className={cn(cardClass, 'flex flex-wrap items-center justify-between gap-4', compact ? 'p-4' : 'p-5 sm:p-6', className)}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06]">
          <Lock className="size-4 text-coral" />
        </span>
        <div className="min-w-0">
          <p className="font-medium">{t(FEATURE_LABEL[feature])}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('Included in {plan}.', { plan })}</p>
        </div>
      </div>
      <Link href="/pricing" className={buttonVariants({ size: compact ? 'sm' : 'default' })}>
        {t('Get {plan}', { plan })}
      </Link>
    </section>
  )
}
