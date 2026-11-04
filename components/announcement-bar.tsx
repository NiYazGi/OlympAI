'use client'

import { useEffect, useState } from 'react'
import { Info, TriangleAlert, X } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

/** A short fingerprint of the text, so a new announcement shows again after the last was closed. */
function keyFor(text: string) {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0
  return `olympai-announcement-${hash}`
}

/**
 * The admin's banner across the top of the app. Closing it hides this text
 * on this device; a new text shows again.
 */
export function AnnouncementBar({ text, tone }: { text: string; tone: 'info' | 'warning' }) {
  const t = useT()
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    try {
      // Read after mount: the server render cannot know what this device closed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(keyFor(text))) setClosed(true)
    } catch {
      // Storage blocked: the banner simply stays.
    }
  }, [text])

  if (closed) return null
  const Icon = tone === 'warning' ? TriangleAlert : Info

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 border-b px-4 py-2.5 text-sm sm:px-5',
        tone === 'warning'
          ? 'border-warning/20 bg-warning/10 text-warning'
          : 'border-white/[0.06] bg-white/[0.03] text-mist',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 flex-1 leading-6 whitespace-pre-line">{text}</p>
      <button
        type="button"
        onClick={() => {
          setClosed(true)
          try {
            window.localStorage.setItem(keyFor(text), '1')
          } catch {
            // Closed for this visit only.
          }
        }}
        aria-label={t('Close')}
        className="rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
