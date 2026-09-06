import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'

export function AuthShell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow: string }) {
  return (
    <main className="flex min-h-dvh bg-background">
      <div className="hidden w-[42%] flex-col justify-between bg-primary p-10 text-white lg:flex">
        <BrandMark light />
        <div className="max-w-sm">
          <p className="mb-4 text-sm font-medium text-white/70">{eyebrow}</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Train with intent. Compete with confidence.</h1>
          <p className="mt-5 text-sm leading-6 text-white/70">A focused practice space for students who want to understand hard problems, not just finish them.</p>
        </div>
        <p className="text-xs text-white/50">OlympAI · Built for ambitious minds</p>
      </div>
      <div className="flex flex-1 flex-col px-5 py-6 sm:px-10 lg:px-20">
        <Link href="/" className="mb-14 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:hidden"><ArrowLeft className="size-4" /> Back home</Link>
        <div className="m-auto w-full max-w-md">
          <div className="mb-8 lg:hidden"><BrandMark /></div>
          <p className="text-sm font-medium text-primary">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  )
}