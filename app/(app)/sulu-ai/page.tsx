import { SuluWorkspace } from '@/components/sulu/sulu-workspace'
import { getChatMessages, getChatSessions } from '@/lib/supabase/chat'

export const metadata = { title: 'Sulu AI' }
export const dynamic = 'force-dynamic'

export default async function SuluAiPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  const sessions = await getChatSessions()
  // Ignore an id that is not the caller's; getChatMessages re-checks ownership.
  const activeSessionId = sessions.some((item) => item.id === session) ? session : undefined
  const messages = activeSessionId ? await getChatMessages(activeSessionId) : []

  return (
    <SuluWorkspace
      sessions={sessions}
      activeSessionId={activeSessionId}
      messages={messages}
    />
  )
}
