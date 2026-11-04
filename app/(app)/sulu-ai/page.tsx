import { SuluWorkspace } from '@/components/sulu/sulu-workspace'
import { getChatMessages, getChatSessions, getTaskChat } from '@/lib/supabase/chat'
import { getTaskDetail } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Sulu AI') }
}
export const dynamic = 'force-dynamic'

export default async function SuluAiPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; task?: string }>
}) {
  const { session, task } = await searchParams
  const sessions = await getChatSessions()
  // Ignore an id that is not the caller's; getChatMessages re-checks ownership.
  let active = sessions.find((item) => item.id === session)
  let messages = active ? await getChatMessages(active.id) : []

  // Opened from a task: continue that task's conversation, or start one tied
  // to it. It used to open a blank general chat that could not see the task.
  if (!active && task) {
    const chat = await getTaskChat(task)
    if (chat) {
      active = sessions.find((item) => item.id === chat.sessionId)
      messages = chat.messages
    }
  }
  const taskId = active?.taskId ?? task ?? null
  const taskDetail = taskId ? await getTaskDetail(taskId) : null

  return (
    <SuluWorkspace
      sessions={sessions}
      activeSessionId={active?.id}
      messages={messages}
      task={taskDetail ? { id: taskDetail.id, title: taskDetail.title } : null}
    />
  )
}
