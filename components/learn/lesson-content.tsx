import { BookOpen, Lightbulb, ListChecks, PencilRuler } from 'lucide-react'
import { MathText } from '@/components/math-text'
import { Figure } from '@/components/learn/figure'
import { getT } from '@/lib/i18n/server'
import type { Lesson, LessonBlock } from '@/lib/types'
import { cardClass, cn } from '@/lib/utils'

const BLOCK: Record<LessonBlock['kind'], { label: string; icon: typeof BookOpen }> = {
  concept: { label: 'Concept', icon: Lightbulb },
  explanation: { label: 'Why it works', icon: BookOpen },
  example: { label: 'Worked example', icon: PencilRuler },
  key_facts: { label: 'Key facts', icon: ListChecks },
}

export async function LessonContent({ lesson }: { lesson: Lesson }) {
  const t = await getT()
  return (
    <div className="min-w-0 space-y-5">
      {lesson.summary ? <MathText text={lesson.summary} className="text-base leading-7 text-muted-foreground" /> : null}
      <ol className="space-y-5">
        {lesson.blocks.map((block, index) => {
          const { label, icon: Icon } = BLOCK[block.kind]
          return (
            <li key={block.id} className={cn(cardClass, 'min-w-0 p-5 sm:p-7', block.kind === 'concept' && 'bg-ember/40')}>
              <div className="eyebrow flex items-center gap-2">
                <Icon aria-hidden className="size-4" /> {t(label)}
                <span className="ml-auto tabular-nums">{index + 1}/{lesson.blocks.length}</span>
              </div>
              {block.heading ? <h2 className="mt-3 text-xl font-semibold">{block.heading}</h2> : null}
              {block.body ? <MathText text={block.body} className="mt-3 text-base leading-8 [&_.katex-display]:py-2" /> : null}
              {block.figure ? <div className="mt-4"><Figure spec={block.figure} /></div> : null}
              {block.items.length ? (
                <ul className="mt-4 space-y-3">
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex gap-3">
                      <span aria-hidden className="mt-3 size-1.5 shrink-0 rounded-full bg-coral" />
                      <MathText text={item} className="min-w-0 text-base leading-7" />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
