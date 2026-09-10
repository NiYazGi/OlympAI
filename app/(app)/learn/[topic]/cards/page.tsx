import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { CardDeck } from '@/components/learn/card-deck'
import { getTopicCards } from '@/lib/supabase/study'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const deck = await getTopicCards(topic)
  return { title: deck ? `${deck.topicName} cards` : 'Cards' }
}

export default async function CardsPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const deck = await getTopicCards(topic)
  if (!deck) notFound()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <Link
        href={`/learn/${deck.topicSlug}`}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {deck.topicName}
      </Link>

      <PageHeader
        title="Recall"
        description={`${deck.subjectName} · ${deck.topicName}`}
        note={
          deck.cards.length ? (
            <p className="pt-1 text-sm text-muted-foreground">
              {deck.dueCount} due now · {deck.learnedCount} of {deck.cards.length} known
            </p>
          ) : null
        }
      />

      <CardDeck deck={deck} />
    </div>
  )
}
