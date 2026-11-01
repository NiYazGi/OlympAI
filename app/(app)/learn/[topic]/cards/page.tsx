import { notFound } from 'next/navigation'
import { BackLink } from '@/components/back-link'
import { PageHeader } from '@/components/page-header'
import { CardDeck } from '@/components/learn/card-deck'
import { getTopicCards } from '@/lib/supabase/study'
import { getT } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const [deck, t] = await Promise.all([getTopicCards(topic), getT()])
  return { title: deck ? t.cards.metaTitle(deck.topicName) : t.cards.fallbackTitle }
}

export default async function CardsPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params
  const [deck, t] = await Promise.all([getTopicCards(topic), getT()])
  if (!deck) notFound()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <BackLink href={`/learn/${deck.topicSlug}`}>{t.topics[deck.topicName] ?? deck.topicName}</BackLink>

      <PageHeader
        title={t.cards.title}
        description={`${t.subjects[deck.subjectName] ?? deck.subjectName} · ${t.topics[deck.topicName] ?? deck.topicName}`}
        note={
          deck.cards.length ? (
            <p className="pt-1 text-sm text-muted-foreground">
              {t.cards.note(deck.dueCount, deck.learnedCount, deck.cards.length)}
            </p>
          ) : null
        }
      />

      <CardDeck deck={deck} />
    </div>
  )
}
