'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Check, Copy, Link2, Loader2, RefreshCw } from 'lucide-react'
import { rotateJoinCode } from '@/app/(app)/class/actions'
import { useT } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { labelClass } from '@/lib/utils'

/**
 * The code, the link, and the two ways to take them back.
 *
 * The link is built in the browser from `location.origin` rather than from a
 * configured site URL: this is the one string a teacher is going to paste into
 * a group chat, and on a preview deployment or a laptop on the school wifi the
 * configured origin is not the one they are looking at.
 */
export function InvitePanel({ classId, code }: { classId: string; code: string }) {
  const t = useT()
  const router = useRouter()
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  async function copy(what: 'link' | 'code') {
    const text = what === 'link' ? `${window.location.origin}/join/${code}` : code
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Clipboard access can be refused. The code is on screen either way,
      // which is the whole reason it is six characters long.
      setError(t.common.notSaved)
    }
  }

  function rotate() {
    if (!confirm(t.classes.rotateConfirm)) return
    setError('')
    const formData = new FormData()
    formData.set('class_id', classId)
    startTransition(async () => {
      const result = await rotateJoinCode(formData)
      if (result.ok) router.refresh()
      else setError(result.error ?? t.common.notSaved)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className={labelClass}>{t.classes.code}</p>
          <button
            type="button"
            onClick={() => copy('code')}
            title={t.classes.code}
            className="font-mono text-3xl font-semibold tracking-[0.2em] tabular-nums transition-colors hover:text-primary"
          >
            {code}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="lg" onClick={() => copy('link')} disabled={pending}>
            {copied === 'link' ? <Check className="size-4" /> : <Link2 className="size-4" />}
            {copied === 'link' ? t.classes.copied : t.classes.copyLink}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => copy('code')} disabled={pending}>
            {copied === 'code' ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied === 'code' ? t.classes.copied : t.classes.code}
          </Button>
          <Button variant="ghost" size="lg" onClick={rotate} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {pending ? t.classes.rotating : t.classes.rotate}
          </Button>
        </div>
      </div>

      <p className="text-sm leading-6 text-muted-foreground">{t.classes.inviteNote}</p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
