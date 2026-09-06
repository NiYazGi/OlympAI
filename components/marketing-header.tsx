'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export function MarketingHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="relative z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="OlympAI home"><BrandMark /></Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#subjects" className="transition-colors hover:text-foreground">Subjects</a>
          <a href="#sulu" className="transition-colors hover:text-foreground">Sulu AI</a>
          <a href="#how" className="transition-colors hover:text-foreground">Progress</a>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button variant="ghost" nativeButton={false} render={<Link href="/login">Log in</Link>} />
          <Button nativeButton={false} render={<Link href="/signup">Start training</Link>}>Start training</Button>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>
      {open ? (
        <div className="border-t border-border bg-card px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-4 text-sm">
            <a href="#subjects" onClick={() => setOpen(false)}>Subjects</a>
            <a href="#sulu" onClick={() => setOpen(false)}>Sulu AI</a>
            <a href="#how" onClick={() => setOpen(false)}>Progress</a>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" nativeButton={false} render={<Link href="/login">Log in</Link>} />
              <Button className="flex-1" nativeButton={false} render={<Link href="/signup">Start training</Link>} />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}