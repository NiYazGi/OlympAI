import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { cardClass } from '@/lib/utils'
import { getLocale, getT } from '@/lib/i18n/server'
import { taskSkills, type SkillTask } from '@/lib/skill-catalogue'
import { TaskSkillTags } from '@/components/learn/task-skill-tags'

const EMPTY = {
  ru: { title: 'Короткий урок ещё не подготовлен', body: 'Конкретные навыки этой задачи пока не размечены. Точный материал появится после проверки связи между условием и методом.' },
  kk: { title: 'Қысқа сабақ әлі дайындалмаған', body: 'Бұл есептің нақты дағдылары әлі белгіленбеген. Шарт пен әдістің байланысы тексерілген соң нақты материал қосылады.' },
  en: { title: 'A short lesson is not prepared yet', body: 'Specific skills for this problem are not tagged yet. Exact material will be added after its connection to the statement is checked.' },
}

export async function TaskMethodGraph({ task }: { task: SkillTask }) {
  const [t, locale] = await Promise.all([getT(), getLocale()])
  const skills = taskSkills(task)
  if (!skills.length) return <section className="rounded-xl border border-border p-4 text-sm">
    <h2 className="font-medium">{EMPTY[locale].title}</h2>
    <p className="mt-1 leading-relaxed text-muted-foreground">{EMPTY[locale].body}</p>
    <Link href="/learn?all=1" className="mt-2 inline-block text-primary hover:underline">{t('Open the topic catalogue')}</Link>
  </section>
  return <section className={`${cardClass} p-4 sm:p-5`} aria-labelledby="task-methods-title">
    <div className="flex items-center gap-2"><BookOpen aria-hidden className="size-4 text-primary" /><h2 id="task-methods-title" className="text-sm font-semibold">{t('How to prepare for this problem')}</h2></div>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t('Problem → method → prerequisite → short lesson → practice')}</p>
    <TaskSkillTags skills={skills} taskId={task.id} />
  </section>
}
