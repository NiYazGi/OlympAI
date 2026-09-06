import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-center">
      <div>
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">This page does not exist.</h1>
        <p className="mt-3 text-muted-foreground">
          Let&apos;s get you back to focused practice.
        </p>
        <Button className="mt-6" nativeButton={false} render={<Link href="/">Go to OlympAI</Link>} />
      </div>
    </main>
  )
}
