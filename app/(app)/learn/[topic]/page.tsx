import { ViewTransition } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Layers } from 'lucide-react'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { StageList } from '@/components/learn/stage-list'
import { ResourceList } from '@/components/resources/resource-list'
import { getTopicLadder } from '@/lib/supabase/study'
import { getTopicReading } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const ladder = await getTopicLadder(topic)
  return { title: ladder ? ladder.name : 'Topic' }
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const ladder = await getTopicLadder(topic)
  if (!ladder) notFound()
  const [reading, t] = await Promise.all([getTopicReading(ladder.id), getT()])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <BackLink href="/learn">{t.learn.allTopics}</BackLink>

      <PageHeader
        title={
          <ViewTransition name={`topic-${ladder.slug}`} share="morph" default="none">
            <span>{t.topics[ladder.name] ?? ladder.name}</span>
          </ViewTransition>
        }
        description={t.subjects[ladder.subjectName] ?? ladder.subjectName}
        note={
          <p className="pt-1 font-mono text-sm tabular-nums text-muted-foreground">
            {t.common.percentThrough(ladder.percent)}
          </p>
        }
      />

      <StageList stages={ladder.stages} next={ladder.next} />

      {/* Beside the ladder, not on it: a deck is a way of keeping what you
          already understand, and it is no longer counted as progress through
          the topic. Hidden entirely when nothing has been written, because an
          empty optional extra is only a thing to wonder about. */}
      {ladder.cards.state !== 'empty' && ladder.cards.href ? (
        <Link
          href={ladder.cards.href}
          prefetch
          className={cn(
            cardClass,
            'group flex items-center gap-3 p-4 text-sm transition-colors hover:bg-muted/40',
          )}
        >
          <Layers className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="font-medium">{t.learn.flashcards}</span>
            <span className="text-muted-foreground">
              {t.ladder.cards.asideNote(ladder.cards.detail)}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      ) : null}

      {/* The rest of the subject. Everything here is someone else's work, under
          a licence that allows the link and the credit that goes with it. */}
      <ResourceList resources={reading} heading={t.learn.readFurther} />
    </div>
  )
}
