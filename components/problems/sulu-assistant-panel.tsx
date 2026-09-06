import { Sparkles } from 'lucide-react'
import { CoachChat } from '@/components/sulu/coach-chat'
import { cardClass } from '@/lib/utils'

/**
 * Passes only the task id. The full context — statement, subject, topic,
 * difficulty, the student's level — is looked up server-side in the API route,
 * because it ends up in the model's system instructions.
 */
export function SuluAssistantPanel({ taskId }: { taskId: string }) {
  return (
    <section className={`${cardClass} h-[36rem] overflow-hidden`}>
      <div className="flex items-center gap-3 border-b border-border bg-background px-5 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
          <Sparkles className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Sulu AI</h2>
          <p className="text-xs text-muted-foreground">Task-aware coaching</p>
        </div>
      </div>
      <div className="h-[calc(100%-4rem)] p-3">
        <CoachChat taskId={taskId} />
      </div>
    </section>
  )
}
