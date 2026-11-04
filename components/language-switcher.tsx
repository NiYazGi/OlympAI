'use client'

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Globe, Loader2 } from 'lucide-react'
import { setLocale } from '@/app/i18n-actions'
import { useLocale, useT } from '@/components/i18n-provider'
import { LOCALE_NAMES, LOCALE_SHORT, LOCALES, type Locale } from '@/lib/i18n/config'
import { cn } from '@/lib/utils'

/**
 * Globe and the current language code; opens a short list of the three
 * languages, each written in itself so it can be found by someone who cannot
 * read the current one.
 *
 * Hand-rolled rather than built on the UI kit's menu: it sits in the header of
 * every public page, and the menu primitive with its positioning engine was the
 * largest piece of JavaScript on the landing page after React itself. A list
 * of three fixed items under a button needs none of it.
 */
export function LanguageSwitcher({ className, full = false }: { className?: string; full?: boolean }) {
  const locale = useLocale()
  const t = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    // Focus the current language when the list opens, like a native select.
    listRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  function choose(next: Locale) {
    setOpen(false)
    buttonRef.current?.focus()
    if (next === locale) return
    startTransition(async () => {
      await setLocale(next)
      router.refresh()
    })
  }

  function onListKey(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])]
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false)
      if (event.key === 'Escape') buttonRef.current?.focus()
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      items[(index + step + items.length) % items.length]?.focus()
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      items[event.key === 'Home' ? 0 : items.length - 1]?.focus()
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('Language')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ash transition-colors outline-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/15',
          open && 'bg-foreground/[0.06] text-foreground',
          className,
        )}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Globe className="size-3.5" />}
        <span className="font-mono text-[11px] tracking-wide">{full ? LOCALE_NAMES[locale] : LOCALE_SHORT[locale]}</span>
      </button>
      <div
        ref={listRef}
        id={listId}
        role="menu"
        aria-label={t('Language')}
        onKeyDown={onListKey}
        hidden={!open}
        className="absolute top-full right-0 z-50 mt-2 w-44 origin-top-right animate-in rounded-xl bg-popover/95 p-1 text-popover-foreground shadow-pop ring-1 ring-hairline backdrop-blur-2xl duration-150 fade-in-0 zoom-in-95"
      >
        {LOCALES.map((option) => (
          <button
            key={option}
            type="button"
            role="menuitemradio"
            aria-checked={option === locale}
            tabIndex={-1}
            onClick={() => choose(option)}
            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm outline-none hover:bg-foreground/[0.06] focus-visible:bg-foreground/[0.08]"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-5 font-mono text-[10px] text-smoke">{LOCALE_SHORT[option]}</span>
              {LOCALE_NAMES[option]}
            </span>
            {option === locale ? <Check className="size-3.5 text-coral" /> : null}
          </button>
        ))}
      </div>
    </div>
  )
}
