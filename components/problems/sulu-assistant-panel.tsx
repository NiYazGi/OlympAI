import { SuluGlyph } from '@/components/brand-mark'
import { CoachChat } from '@/components/sulu/coach-chat'
import { cardClass } from '@/lib/utils'
import { getT } from '@/lib/i18n/server'
import { getTaskChat } from '@/lib/supabase/chat'

/**
 * Passes only the task id. The full context — statement, subject, topic,
 * difficulty, the student's level — is looked up server-side in the API route,
 * because it ends up in the model's system instructions.
 */
export async function SuluAssistantPanel({ taskId }: { taskId: string }) {
  const t = await getT()
  const chat = await getTaskChat(taskId)

  return (
    <section className={`${cardClass} h-[36rem] overflow-hidden`}>
      <div className="flex items-center gap-3 border-b border-foreground/[0.06] px-5 py-4">
        <div className="flex size-8 items-center justify-center rounded-full bg-void shadow-key">
          <SuluGlyph className="size-5" />
        </div>
        <div>
          <h2 className="text-sm font-medium">{t('Sulu AI')}</h2>
          <p className="text-xs text-muted-foreground">{t('Task-aware coaching')}</p>
        </div>
      </div>
      <div className="h-[calc(100%-4rem)] p-3">
        <CoachChat taskId={taskId} sessionId={chat?.sessionId} initialMessages={chat?.messages ?? []} />
      </div>
    </section>
  )
}
