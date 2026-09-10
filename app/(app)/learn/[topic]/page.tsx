import { ViewTransition } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { StageList } from '@/components/learn/stage-list'
import { getTopicLadder } from '@/lib/supabase/study'

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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href="/learn"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All topics
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
            {ladder.percent}% through this topic. The order is a suggestion — you can start
            anywhere.
          </p>
        }
      />

      <StageList stages={ladder.stages} next={ladder.next} />
    </div>
  )
}
