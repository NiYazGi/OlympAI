import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getT } from '@/lib/i18n'

export default async function NotFound() {
  const t = await getT()

  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-center">
      <div>
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t.errors.notFound}</h1>
        <p className="mt-3 text-muted-foreground">{t.errors.backToPractice}</p>
        <Button
          className="mt-6"
          nativeButton={false}
          render={<Link href="/">{t.errors.goHome}</Link>}
        />
      </div>
    </main>
  )
}
