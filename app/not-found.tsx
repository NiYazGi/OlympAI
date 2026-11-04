import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getT } from '@/lib/i18n/server'

export default async function NotFound() {
  const t = await getT()

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-void p-6 text-center">
      <div className="hero-atmosphere opacity-60" aria-hidden>
        <span className="hero-bar hero-bar--coral-2" />
      </div>
      <div className="enter relative z-10">
        <p className="font-mono text-[64px] leading-none text-fade">404</p>
        <h1 className="mt-6 text-[32px] font-normal text-foreground">{t('This page does not exist.')}</h1>
        <p className="mt-3 text-ash">
          {t('Let\'s get you back to focused practice.')}
        </p>
        <Button className="mt-6" nativeButton={false} render={<Link href="/">{t('Go to OlympAI')}</Link>} />
      </div>
    </main>
  )
}
