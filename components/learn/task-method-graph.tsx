import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { methodsForTask } from '@/lib/task-methods'
import { cardClass } from '@/lib/utils'

export function TaskMethodGraph({ taskId }: { taskId: string }) {
  const methods = methodsForTask(taskId)
  if (!methods.length) return <section className="rounded-xl border border-border p-4 text-sm"><h2 className="font-medium">Методы задачи ещё не размечены</h2><p className="mt-1 leading-relaxed text-muted-foreground">Точный урок пока не подобран. Общий конспект темы не считается материалом по методу этой задачи.</p><Link href="/learn?all=1" className="mt-2 inline-block text-primary hover:underline">Открыть каталог тем</Link></section>
  return <section className={`${cardClass} p-4 sm:p-5`} aria-labelledby="task-methods-title">
    <div className="flex items-center gap-2"><BookOpen aria-hidden className="size-4 text-primary" /><h2 id="task-methods-title" className="text-sm font-semibold">Как подготовиться к этой задаче</h2></div>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Задача → метод → предпосылка → короткий урок → тренировка</p>
    <ol className="mt-4 space-y-3">{methods.map((method, index) => <li key={method.id} className="relative border-l border-border pl-4"><span aria-hidden className="absolute -left-1 top-1 size-2 rounded-full bg-primary" />
      <Link href={`/methods/${method.id}?from=${encodeURIComponent(taskId)}`} transitionTypes={['nav-forward']} className="method-link group block rounded-lg px-2 py-2 focus-visible:outline-2 focus-visible:outline-primary">
        <span className="flex items-center justify-between gap-2 text-sm font-medium"><span>{index + 1}. {method.name}</span><ArrowRight aria-hidden className="size-3.5 shrink-0" /></span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Нужно знать: {method.prerequisites.map((item) => item.title.toLowerCase()).join('; ')}</span>
        <span className="mt-2 block text-xs font-medium text-primary">Урок и тренировочная задача</span>
      </Link>
    </li>)}</ol>
  </section>
}
