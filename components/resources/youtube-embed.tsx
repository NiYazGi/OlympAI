'use client'

import { useState } from 'react'
import { ExternalLink, Play } from 'lucide-react'
import { youTubeId } from '@/lib/licence'
import { cardClass, cn } from '@/lib/utils'

/**
 * A YouTube lecture, embedded the only way the terms allow: the official
 * player, ads intact, nothing re-hosted.
 *
 * Two deliberate choices beyond that.
 *
 * Nothing is requested from Google until the student clicks — not even the
 * thumbnail, which lives on Google's servers and would announce every page
 * view to it. The placeholder is drawn locally, so a page with ten lectures
 * makes zero third-party requests until one is actually played. That matters
 * more than usual here: the audience is schoolchildren.
 *
 * Once playing it uses youtube-nocookie.com, which holds off on the tracking
 * cookies until playback starts.
 */
export function YouTubeEmbed({
  url,
  title,
  className,
}: {
  url: string
  title: string
  className?: string
}) {
  const [playing, setPlaying] = useState(false)
  // Built from the parsed id, never from the raw URL, so a crafted link in the
  // database cannot become an arbitrary iframe.
  const id = youTubeId(url)

  if (!id) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          cardClass,
          'flex items-center gap-2 p-4 text-sm text-primary hover:underline',
          className,
        )}
      >
        {title} <ExternalLink className="size-3.5 shrink-0" />
      </a>
    )
  }

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className={cn(
          cardClass,
          'group relative flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden bg-muted/40 transition-colors hover:bg-muted/70',
          className,
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105">
          <Play className="ml-0.5 size-6 fill-current" />
        </span>
        <span className="max-w-sm px-6 text-center text-sm font-medium text-pretty">{title}</span>
        <span className="text-xs text-muted-foreground">
          Plays on YouTube · nothing is loaded until you press play
        </span>
      </button>
    )
  }

  return (
    <div className={cn(cardClass, 'aspect-video w-full overflow-hidden', className)}>
      <iframe
        // youtube-nocookie defers the tracking cookies until playback.
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="size-full border-0"
      />
    </div>
  )
}
