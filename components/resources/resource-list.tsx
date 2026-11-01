import { BookOpen, ExternalLink, Link2 } from 'lucide-react'
import { YouTubeEmbed } from '@/components/resources/youtube-embed'
import { LICENCES, licenceInfo, type Licence } from '@/lib/licence'
import { getT } from '@/lib/i18n'
import { cardClass, cn, labelClass } from '@/lib/utils'

export type Resource = {
  id: string
  kind: 'video' | 'reading' | 'reference'
  title: string
  url: string
  description: string | null
  licence: Licence
  attribution: string | null
}

/**
 * Supplementary material with its terms attached.
 *
 * Attribution is rendered from the row rather than left to whoever adds the
 * content: for CC BY and anything used by permission, credit is a condition of
 * the licence, not a courtesy, and a condition that depends on someone
 * remembering is a condition that will be missed.
 */
export async function ResourceList({
  resources,
  heading,
}: {
  resources: Resource[]
  /** Defaults to "Material"; the topic page calls it "Read further". */
  heading?: string
}) {
  if (resources.length === 0) return null
  const t = await getT()
  const title = heading ?? t.learn.material

  return (
    <section className="space-y-4">
      <h2 className={labelClass}>{title}</h2>
      <ul className="space-y-4">
        {resources.map((resource) => (
          <li key={resource.id} className="space-y-2">
            {resource.kind === 'video' ? (
              <YouTubeEmbed url={resource.url} title={resource.title} />
            ) : (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(cardClass, 'flex items-start gap-3 p-4 transition-colors hover:bg-muted/40')}
              >
                {resource.kind === 'reading' ? (
                  <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                ) : (
                  <Link2 className="mt-0.5 size-4 shrink-0 text-primary" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {resource.title}
                    <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                  </span>
                  {resource.description ? (
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {resource.description}
                    </span>
                  ) : null}
                </span>
              </a>
            )}
            <Attribution licence={resource.licence} attribution={resource.attribution} url={resource.url} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Attribution({
  licence,
  attribution,
  url,
}: {
  licence: Licence
  attribution: string | null
  url?: string | null
}) {
  const info = licenceInfo(licence)
  // Original material needs no credit line and no disclaimer.
  if (licence === 'original' && !attribution) return null

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {attribution ? <span>{attribution}</span> : null}
      <span
        title={info.note}
        className={cn(
          'rounded-full border px-2 py-0.5',
          licence === 'unknown'
            ? 'border-warning/40 text-warning'
            : 'border-border text-muted-foreground',
        )}
      >
        {info.label}
      </span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground hover:underline"
        >
          source
        </a>
      ) : null}
    </p>
  )
}
