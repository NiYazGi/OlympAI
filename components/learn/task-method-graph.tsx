import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { methodsForTask } from '@/lib/task-methods'
import { cardClass } from '@/lib/utils'
import { getT } from '@/lib/i18n/server'

export async function TaskMethodGraph({ taskId }: { taskId: string }) {
  const t = await getT()
  const methods = methodsForTask(taskId)
  if (!methods.length) return <section className="rounded-xl border border-border p-4 text-sm"><h2 className="font-medium">{t('The methods for this problem are not tagged yet')}</h2><p className="mt-1 leading-relaxed text-muted-foreground">{t('No exact lesson has been chosen yet. The general topic notes do not count as material on the method of this problem.')}</p><Link href="/learn?all=1" className="mt-2 inline-block text-primary hover:underline">{t('Open the topic catalogue')}</Link></section>
  return <section className={`${cardClass} p-4 sm:p-5`} aria-labelledby="task-methods-title">
    <div className="flex items-center gap-2"><BookOpen aria-hidden className="size-4 text-primary" /><h2 id="task-methods-title" className="text-sm font-semibold">{t('How to prepare for this problem')}</h2></div>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t('Problem → method → prerequisite → short lesson → practice')}</p>
    <ol className="mt-4 space-y-3">{methods.map((method, index) => <li key={method.id} className="relative border-l border-border pl-4"><span aria-hidden className="absolute -left-1 top-1 size-2 rounded-full bg-primary" />
      <Link href={`/methods/${method.id}?from=${encodeURIComponent(taskId)}`} transitionTypes={['nav-forward']} className="method-link group block rounded-lg px-2 py-2 focus-visible:outline-2 focus-visible:outline-primary">
        <span className="flex items-center justify-between gap-2 text-sm font-medium"><span>{index + 1}. {method.name}</span><ArrowRight aria-hidden className="size-3.5 shrink-0" /></span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{t('You need to know: {list}', { list: method.prerequisites.map((item) => item.title.toLowerCase()).join('; ') })}</span>
        <span className="mt-2 block text-xs font-medium text-primary">{t('Lesson and practice problem')}</span>
      </Link>
    </li>)}</ol>
  </section>
}
