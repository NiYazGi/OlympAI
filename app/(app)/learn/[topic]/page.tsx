import { ViewTransition } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { StageList } from '@/components/learn/stage-list'
import { getTopicLadder } from '@/lib/supabase/study'
import { getT } from '@/lib/i18n/server'
import { cardClass } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const ladder = await getTopicLadder(topic)
  const t = await getT()
  return { title: ladder ? ladder.name : t('Topic') }
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const t = await getT()

  const { topic } = await params
  const ladder = await getTopicLadder(topic)
  if (!ladder) notFound()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href="/learn"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('All topics')}
      </Link>

      <PageHeader
        title={
          <ViewTransition name={`topic-${ladder.slug}`} share="morph" default="none">
            <span>{ladder.name}</span>
          </ViewTransition>
        }
        description={ladder.subjectName}
        note={
          <p className="pt-1 text-sm text-muted-foreground">
            {ladder.percent}{t('% through this topic. The order is a suggestion — you can start anywhere.')}
          </p>
        }
      />

      <StageList stages={ladder.stages} next={ladder.next} />

      {/* Beside the ladder, not on it: spaced repetition keeps its own
          schedule and is never the step the app sends you to next. */}
      {ladder.deck.href ? (
        <Link
          href={ladder.deck.href}
          prefetch
          className={`${cardClass} flex items-center gap-3 p-4 transition-colors hover:bg-foreground/[0.04]`}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{ladder.deck.label}</span>
            <span className="block text-xs text-muted-foreground">{ladder.deck.detail}</span>
          </span>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">{ladder.deck.percent}%</span>
        </Link>
      ) : null}
    </div>
  )
}
