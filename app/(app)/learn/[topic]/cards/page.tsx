import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { CardDeck } from '@/components/learn/card-deck'
import { getTopicCards } from '@/lib/supabase/study'
import { getT } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const deck = await getTopicCards(topic)
  const t = await getT()
  return { title: deck ? t('{topic} cards', { topic: deck.topicName }) : t('Cards') }
}

export default async function CardsPage({ params }: { params: Promise<{ topic: string }> }) {
  const t = await getT()

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
        title={t('Recall')}
        description={`${t(deck.subjectName)} · ${deck.topicName}`}
        note={
          deck.cards.length ? (
            <p className="pt-1 text-sm text-muted-foreground">
              {t('{due} due now · {fresh} new · {learned} of {total} known', {
                due: deck.dueCount,
                fresh: deck.newCount,
                learned: deck.learnedCount,
                total: deck.cards.length,
              })}
            </p>
          ) : null
        }
      />

      <CardDeck deck={deck} />
    </div>
  )
}
